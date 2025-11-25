import { useRef, useState, useEffect } from "react";
import RawImageSection from "./Dashboard/RawImageSection";
import ProcessedImageSection from "./Dashboard/ProcessedImageSection";
import InProgressSection from "./Dashboard/InProgressSection";

import { useAuth } from "./auth/AuthContext";
import { Toast } from "./Toast";
import Syncing from "./Syncing";
import { onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { db } from "./auth/firebase";
import { exportProcessedCSV } from "../utils/exportCSV";

const API_BASE = "http://localhost:3000";

export default function Dashboard() {
    const { user } = useAuth();

    // --- STATE ---
    const [unprocessedItems, setUnprocessedItems] = useState([]);
    const [inProgressItems, setInProgressItems] = useState([]);
    const [processed, setProcessed] = useState([]);

    const [selectedIds, setSelectedIds] = useState(new Set());
    const [toastMsg, setToastMsg] = useState(null);
    const [picking, setPicking] = useState(false);

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const [error, setError] = useState("");

    const pollingRef = useRef(null);

    // 1. Real-time Listener
    useEffect(() => {
        if (!user) return;
        const q = query(collection(db, `users/${user.uid}/session_items`), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allItems = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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
            const res = await fetch(`${API_BASE}/api/processed`, {
                headers: { Authorization: `Bearer ${idToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProcessed(data.items || []);
            }
        } catch (e) {
            console.error("Failed to load history:", e);
        } finally {
            setLoadingHistory(false);
        }
    }

    // 3. Actions
    async function openPicker() {
        try {
            setError("");
            setPicking(true);
            const res = await fetch(`${API_BASE}/api/picker/create-session`, { credentials: "include" });
            if (res.status === 401) { window.location.href = `${API_BASE}/auth/google`; return; }
            const { pickerUri, sessionId } = await res.json();
            const popup = window.open(pickerUri, '_blank', 'width=800,height=600');
            if (!popup) { setError("Popup blocked!"); setPicking(false); return; }
            pollForPhotos(sessionId, popup);
        } catch (e) { console.error(e); setPicking(false); }
    }

    async function pollForPhotos(sessionId, popupWindow) {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/picker/poll-session?sessionId=${sessionId}`, { credentials: "include" });
                const data = await res.json();
                if (data.status === "complete") {
                    clearInterval(pollingRef.current);
                    if (popupWindow && !popupWindow.closed) popupWindow.close();
                    setPicking(false);
                    await saveToSession(data.items, 'google-picker');
                }
            } catch (e) { /* ... */ }
        }, 2000);
    }

    const handleLocalUpload = async (event) => {
        const files = Array.from(event.target.files);
        if (!files.length) return;
        const items = await Promise.all(files.map(async file => ({
            source: 'local',
            filename: file.name,
            mimeType: file.type,
            base64: await toBase64(file)
        })));
        await saveToSession(items, 'local');
    };

    async function saveToSession(items, source) {
        const idToken = await user.getIdToken();
        await fetch(`${API_BASE}/api/session/draft`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${idToken}` },
            body: JSON.stringify({ items, source })
        });
    }

    async function handleAnalyze() {
        if (selectedIds.size === 0) return;
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
            setError("Failed to analyze photos.");
        } finally {
            setTimeout(() => setIsAnalyzing(false), 500);
        }
    }

    async function handleFinalize(sessionId, selectedCrop) {
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
            console.error("Finalize failed", e);
            setError("Failed to save selection.");
        }
    }

    const toggleOne = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

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
                {/* HEADER */}
                <div className="d-flex justify-content-between align-items-center mb-5 pb-3 border-bottom">
                    <div>
                        <h2 className="h3 fw-bold text-dark mb-1">Content Dashboard</h2>
                        <p className="text-muted mb-0">Manage your photo pipeline: Upload &rarr; Review &rarr; Publish</p>
                    </div>

                    <div className="d-flex gap-2">
                        <input type="file" id="local-upload" multiple className="d-none" onChange={handleLocalUpload} />
                        <label htmlFor="local-upload" className="btn btn-outline-secondary d-flex align-items-center gap-2">
                            <i className="bi bi-upload"></i> Upload File
                        </label>

                        <button className="btn btn-outline-primary d-flex align-items-center gap-2" onClick={openPicker} disabled={picking}>
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

const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});