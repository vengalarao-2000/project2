import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import RawImageSection from "./Dashboard/RawImageSection";
import ProcessedImageSection from "./Dashboard/ProcessedImageSection";
import InProgressSection from "./Dashboard/InProgressSection";
import ReactGA from 'react-ga4';
import { useAuth } from "./auth/AuthContext";
import { Toast } from "./Toast";
import Syncing from "./Syncing";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "./auth/firebase";
import { exportProcessedCSV } from "../utils/exportCSV";
import { logToCloud } from "../utils/logger";

const API_BASE = "http://localhost:5001";

export default function Dashboard() {
    const { user } = useAuth();

    //3 states for 3 sections in dashboard.
    //Section-1,2 are valid only for the session and deleted once user logs out.
    //Section-3 is permanent history of processed items.
    const [unprocessedItems, setUnprocessedItems] = useState([]);
    const [inProgressItems, setInProgressItems] = useState([]);
    const [processed, setProcessed] = useState([]);
    const navigate = useNavigate();

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [toastMsg, setToastMsg] = useState(null);
    const [picking, setPicking] = useState(false);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [error, setError] = useState("");

    const pollingRef = useRef(null);
    const fileInputRef = useRef(null);

    // 1. Real-time Listener
    useEffect(() => {
        if (!user) return;
        // Get session_items collection for unprocessed & in-progress items
        const q = query(collection(db, `users/${user.uid}/session_items`), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            //segregate items based on status into section-1 and section-2 respectively
            setUnprocessedItems(allItems.filter(i => i.status === 'picked'));
            setInProgressItems(allItems.filter(i => i.status === 'analyzing' || i.status === 'ready_for_selection'));
        });
        return () => unsubscribe();
    }, [user]);

    // 2. Fetch History
    useEffect(() => {
        if (user) fetchProcessedHistory(user);
    }, [user]);

    async function fetchProcessedHistory(currentUser) {
        try {
            setLoadingHistory(true);
            const idToken = await currentUser.getIdToken();
            // Call backend to get processed items i.e permanent storage
            const res = await fetch(`${API_BASE}/api/processed`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                // populate section-3 with permanent processed items
                setProcessed(data.items || []);
                logToCloud("Dashboard history loaded", "INFO", { count: data.items?.length });
            }
        } catch (e) {
            console.error("Failed to load history:", e);
            logToCloud("Failed to load dashboard history", "ERROR", { error: e.message });
        } finally {
            setLoadingHistory(false);
        }
    }

    // 3. Actions
    async function openPicker() {
        //Get the token
        const idToken = await user.getIdToken();
        logToCloud("User opened Google Picker", "INFO");
        try {
            setError("");
            setPicking(true);

            //Track the event: User initiated photo selection from Google Photos
            ReactGA.event({
                category: "Select Content",
                action: "Open Google Picker",
                label: "Started Flow"
            });
            // Call backend to create Google Picker session
            const res = await fetch(`${API_BASE}/api/picker/create-session`, { headers: { Authorization: `Bearer ${idToken}` }, credentials: "include" });
            if (res.status === 401) { window.location.href = `${API_BASE}/auth/google`; return; }
            const { pickerUri, sessionId } = await res.json();
            // Open Google Picker in new popup window
            const popup = window.open(pickerUri, '_blank', 'width=800,height=600');
            if (!popup) { setError("Popup blocked!"); setPicking(false); logToCloud("Popup blocked by browser", "WARNING"); return; }
            pollForPhotos(sessionId, popup);
        } catch (e) {
            console.error(e);
            setPicking(false);
            logToCloud("Google Picker failed to open", "ERROR", { error: e.message });
        }
    }

    //polling function to check for photo selection completion
    // once complete, close popup and save selected photos to session storage
    //bridges the gap between pop up window and main dashboard
    async function pollForPhotos(sessionId, popupWindow) {
        const idToken = await user.getIdToken();
        if (pollingRef.current) clearInterval(pollingRef.current);
        //poll every 2 seconds
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/picker/poll-session?sessionId=${sessionId}`, { headers: { Authorization: `Bearer ${idToken}` }, credentials: "include" });
                const data = await res.json();
                // If selection is complete
                if (data.status === "complete") {
                    clearInterval(pollingRef.current);
                    if (popupWindow && !popupWindow.closed) popupWindow.close();
                    setPicking(false);

                    //Track the event: User completed photo selection from Google Photos
                    ReactGA.event({
                        category: "Select Content",     // Grouping
                        action: "Selected from Google",  // Specific Action
                        label: `Count: ${data.items.length}` // Metadata (How many photos)
                    });
                    logToCloud("Google Photos selection complete", "INFO", { count: data.items.length });
                    // Save selected items to session storage and set the source as 'google-picker'
                    await saveToSession(data.items, 'google-picker');
                }
            } catch (e) { console.error(e); }
        }, 2000);
    }

    //handle local file uploads
    const handleLocalUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;

        logToCloud("User started local upload", "INFO", { fileCount: files.length });

        // Track the event: This tell if people prefer local upload or google photos
        ReactGA.event({
            category: "Select Content",
            action: "Upload Local Files",
            label: `Uploaded ${files.length} images`
        });

        // Prepare items for session storage
        const items = await Promise.all(files.map(async file => ({
            source: 'local',
            filename: file.name,
            mimeType: file.type,
            base64: await toBase64(file)
        })));
        await saveToSession(items, 'local');
    };

    // save selected/uploaded items to session storage via backend API
    async function saveToSession(items, source) {
        // Track the event: User added photos to session via local upload
        if (source === 'local') {
            ReactGA.event({
                category: "Core Feature",
                action: "Direct Upload",
                label: `Count: ${items.length}`
            });
        }

        const idToken = await user.getIdToken();
        // Call backend to save to session_items
        await fetch(`${API_BASE}/api/session/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ items, source })
        });
    }

    //handle analyze using backend API (Unprocessed to In Progress)
    async function handleAnalyze() {
        if (selectedIds.size === 0) return;
        logToCloud("User clicked Generate Analysis", "INFO", { count: selectedIds.size });

        // Track the event: User initiated analysis on selected photos
        ReactGA.event({
            category: "Core Feature",
            action: "Generate Analysis",
            label: `Items: ${selectedIds.size}`
        });

        try {
            setIsAnalyzing(true);
            setError("");
            const idToken = await user.getIdToken();
            await fetch(`${API_BASE}/api/analyze`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ itemIds: Array.from(selectedIds) }),
                credentials: "include"
            });
            setSelectedIds(new Set());
        } catch (e) {
            ReactGA.event({
                category: "Error",
                action: "Analysis Failed",
                label: e.message
            });
            logToCloud("Dashboard Analysis Failed", "ERROR", { error: e.message });
            setError("Failed to analyze photos.");
        } finally {
            setTimeout(() => setIsAnalyzing(false), 500);
        }
    }

    //finalize selection and save to permanent storage (in progree to Generated Results)
    async function handleFinalize(sessionId, selectedCrop) {
        logToCloud("User finalizing crop", "INFO", { crop: selectedCrop });
        //track the event: User finalized crop selection for a photo
        ReactGA.event({
            category: "Engagement",
            action: "Selected Crop",
            label: selectedCrop
        });

        try {
            const idToken = await user.getIdToken();
            const res = await fetch(`${API_BASE}/api/finalize`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
                body: JSON.stringify({ sessionId, selectedCrop }),
            });

            if (!res.ok) throw new Error("Failed");

            fetchProcessedHistory(user);
            setToastMsg("Saved to Generated Results!");
            setTimeout(() => setToastMsg(null), 3000);
        } catch (e) {
            logToCloud("Finalize failed", "ERROR", { error: e.message });
            ReactGA.event({
                category: "Error",
                action: "Finalize Failed",
                label: e.message
            });
            console.error("Finalize failed", e);
            setError("Failed to save selection.");
        }
    }

    //toggle selection of individual items in unprocessed section
    const toggleOne = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            //delete if already selected else add to selection
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    //select or deselect all items in unprocessed section
    const toggleAll = () => {
        setSelectedIds(prev =>
            prev.size === unprocessedItems.length ? new Set() : new Set(unprocessedItems.map(i => i.id))
        );
    };

    if (isAnalyzing) return <Syncing />;

    return (
        <div className="min-vh-100 bg-light">
            <Toast message={toastMsg} onClose={() => setToastMsg(null)} />

            <main className="container py-4">
                <button onClick={() => navigate('/connect')} className="btn btn-link text-decoration-none mb-3 ps-0">
                    <ArrowLeft size={16} /> Back to Connect
                </button>
                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
                    <div>
                        <h2 className="h3 fw-bold text-dark mb-1">Content Dashboard</h2>
                        <p className="text-muted mb-0">Manage your photo pipeline: Upload &rarr; Review &rarr; Publish</p>
                    </div>

                    <div className="d-flex gap-2">
                        {/* HIDDEN INPUT: 
                            We use visibility: hidden and position: absolute so it remains 
                            in the DOM (clickable via script) but invisible to the user.
                        */}
                        <input
                            type="file"
                            ref={fileInputRef}
                            multiple
                            accept="image/*" // Limit to images
                            style={{
                                opacity: 0,
                                position: "absolute",
                                zIndex: -1,
                                width: 0,
                                height: 0
                            }}
                            onChange={handleLocalUpload}
                        />

                        {/* UPLOAD BUTTON */}
                        <button
                            type="button" // Important: Prevents form submit behavior
                            className="btn btn-outline-secondary d-flex align-items-center gap-2"
                            onClick={() => {
                                // Reset value so selecting the same file twice triggers onChange
                                if (fileInputRef.current) {
                                    fileInputRef.current.value = '';
                                    fileInputRef.current.click();
                                }
                            }}
                        >
                            <i className="bi bi-upload"></i> Upload File
                        </button>

                        {/* GOOGLE PICKER BUTTON */}
                        <button
                            type="button"
                            className="btn btn-outline-primary d-flex align-items-center gap-2"
                            onClick={openPicker}
                            disabled={picking}
                        >
                            <i className="bi bi-google"></i> {picking ? "Waiting..." : "Pick from Google Photos"}
                        </button>
                    </div>
                </div>

                {error && <div className="alert alert-danger mb-4 shadow-sm">{error}</div>}

                {/* --- SECTION 1: UNPROCESSED --- */}
                <section className="mb-5">
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="h5 text-secondary fw-bold mb-0">
                            1. Unprocessed Items <span className="badge bg-secondary ms-2 rounded-pill">{unprocessedItems.length}</span>
                        </h4>

                        <button
                            className="btn btn-primary px-4"
                            onClick={handleAnalyze}
                            disabled={selectedIds.size === 0}
                        >
                            Generate Analysis {selectedIds.size > 0 && `(${selectedIds.size})`}
                        </button>
                    </div>

                    {unprocessedItems.length > 0 ? (
                        <RawImageSection
                            photos={unprocessedItems}
                            selectedIds={selectedIds}
                            onToggleOne={toggleOne}
                            onToggleAll={toggleAll}
                        />
                    ) : (
                        <EmptySection
                            message="Your upload queue is empty. Add more photos using direct upload or google photos"
                        />
                    )}
                </section>

                {/* --- SECTION 2: IN PROGRESS --- */}
                <section className="mb-5">
                    <h4 className="h5 text-primary fw-bold mb-3 pb-2 border-bottom border-primary border-opacity-25">
                        2. Review & Select Crop <span className="badge bg-primary ms-2 rounded-pill">{inProgressItems.length}</span>
                    </h4>

                    {inProgressItems.length > 0 ? (
                        <InProgressSection
                            items={inProgressItems}
                            onFinalize={handleFinalize}
                        />
                    ) : (
                        <EmptySection
                            message="No items pending review. Select Unprocessed items above and click 'Generate Analysis'."
                        />
                    )}
                </section>

                {/* --- SECTION 3: GENERATED RESULTS --- */}
                <section>
                    {/* Header Row: Title Left, Button Right */}
                    <div className="d-flex justify-content-between align-items-center mb-3 pb-2 border-bottom">
                        <h4 className="h5 text-dark fw-bold mb-0">
                            3. Generated Results <span className="badge bg-dark ms-2 rounded-pill">{processed.length}</span>
                        </h4>

                        {/* Only show export button if there are results */}
                        {processed.length > 0 && (
                            <button
                                className="btn btn-primary btn-sm"
                                onClick={() => exportProcessedCSV(processed)}
                            >
                                Export CSV
                            </button>
                        )}
                    </div>

                    {/* Content Area */}
                    {loadingHistory ? (
                        <div className="text-center text-muted py-5">
                            <div className="spinner-border text-secondary mb-2" role="status"></div>
                            <div>Loading history...</div>
                        </div>
                    ) : processed.length > 0 ? (
                        <ProcessedImageSection processed={processed} />
                    ) : (
                        <EmptySection
                            message="No generated results yet. Complete the review step to see your final assets here."
                        />
                    )}
                </section>
            </main>
        </div>
    );
}

// Helper for consistent empty state styling
function EmptySection({ message }) {
    return (
        <div className="text-center py-5 bg-white rounded-3 shadow-sm border border-dashed border-secondary-subtle">
            <p className="text-muted mb-0 small fw-medium px-3">{message}</p>
        </div>
    );
}

// Helper to convert file to base64 string
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});