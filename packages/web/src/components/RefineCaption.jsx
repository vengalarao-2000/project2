import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Wand2, Download } from "lucide-react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./auth/firebase";
import { useAuth } from "./auth/AuthContext";
import "../styles/refineCaption.min.css";
import { Toast } from "./Toast";
import ReactGA from 'react-ga4';
import { logToCloud } from "../utils/logger";

const API_BASE = "http://localhost:3000";

export default function RefineCaption() {
    // Get photo ID from URL
    const { id } = useParams();
    // Auth context
    const { user } = useAuth();
    const navigate = useNavigate();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState({ message: null, type: "success" });
    const [narrative, setNarrative] = useState("");

    // Editable States
    const [caption, setCaption] = useState("");
    const [userInstruction, setUserInstruction] = useState("");

    // Interaction States
    const [isRefining, setIsRefining] = useState(false);
    const [isFusing, setIsFusing] = useState(false);
    const [fusedImageUrl, setFusedImageUrl] = useState(null);
    // Image load state for fused image
    const [imageLoaded, setImageLoaded] = useState(false);

    // 1. Fetch Data on Load
    useEffect(() => {
        if (!user || !id) return;
        // Fetch photo data from Firestore
        async function fetchData() {
            try {
                const docRef = doc(db, `users/${user.uid}/photos/${id}`);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    const item = snap.data();
                    setData(item);
                    // Initialize state with DB values
                    setCaption(item.caption || "");
                    setNarrative(item.narrative || "No narrative generated yet.");
                    //handles the rendering of fused image if it exists or placeholder or loading icon when processing
                    if (item.fusedUrl) {
                        setFusedImageUrl(item.fusedUrl);
                        setImageLoaded(true); // Trust that the URL exists, show it immediately
                    } else {
                        setFusedImageUrl(null);
                        //Displays a placeholder until user fuses a new image
                        setImageLoaded(false);
                    }
                }
            } catch (e) {
                console.error(e);
                logToCloud("Failed to fetch refine data", "ERROR", { photoId: id, error: e.message });
            }
            finally { setLoading(false); }
        }
        fetchData();
    }, [user, id]);

    // 2. Call AI to Refine Text
    const handleRefine = async () => {
        if (!userInstruction.trim()) return;
        // Track the event: User refined caption using AI
        ReactGA.event({
            category: "AI Engagement",
            action: "Refine Text",
            label: `Instruction Length: ${userInstruction.length}`
        });

        setIsRefining(true);
        logToCloud("User initiated text refinement", "INFO", { instruction_length: userInstruction.length });

        try {
            // Call backend API to refine caption
            // Get ID token of user from auth
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE}/api/refine-text`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ currentCaption: caption, instruction: userInstruction })
            });
            const result = await res.json();
            setCaption(result.caption);
            setNarrative(result.narrative);
            setUserInstruction(""); // Clear input after success
        } catch (e) {
            console.error(e);
            logToCloud("Text refinement failed", "ERROR", { error: e.message });
        }
        finally { setIsRefining(false); }
    };

    //helper function to display toast message
    const showToast = ({ message, type = "success" }) => {
        setToast({ message: message, type: "success" });
        setTimeout(() => setToast({ message: null, type: "success" }), 3000);
    }

    // 3. Save Changes to DB
    //User can refine the caption, narrative multiple times before saving
    const handleSave = async () => {
        logToCloud("User clicking save on refinements", "INFO", { photoId: id });

        // Track the event: User saved refinements
        ReactGA.event({
            category: "User Engagement",
            action: "Save Refinements",
            label: fusedImageUrl ? "With Fused Image" : "Text Only"
        });

        try {
            //Get ID token of user from auth
            const token = await user.getIdToken();

            // Prepare payload
            const payload = {
                photoId: id,
                caption: caption,
                narrative: narrative,
                // Only send image if it's a new Base64 string (starts with data:)
                // If it's already a generic URL (https://), we don't need to re-upload it
                fusedImageBase64: fusedImageUrl && fusedImageUrl.startsWith("data:") ? fusedImageUrl : null
            };

            const res = await fetch(`${API_BASE}/api/save-refinements`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save");

            const result = await res.json();

            // If we uploaded a new image, the backend returns the new permanent URL.
            // Update state so if we click save again, we don't re-upload.
            if (result.updatedData.fusedUrl) {
                setFusedImageUrl(result.updatedData.fusedUrl);
            }
            logToCloud("Refinements saved successfully", "INFO", { photoId: id });
            showToast({ message: "Saved successfully!", type: "success" });
            ReactGA.event({
                category: "User Action",
                action: "Save Refinements",
                label: "Success"
            });

        } catch (e) {
            console.error("Save failed", e);
            logToCloud("Failed to save refinements", "ERROR", { error: e.message });
            showToast({ message: "Failed to save changes.", type: "error" });
        }
    };

    // 4. Fuse Image with Caption
    const handleFuse = async () => {
        // Track the event: User initiated image fusion
        ReactGA.event({
            category: "Core Feature",
            action: "Generate Fuse Preview",
            label: "Started"
        });
        logToCloud("User generating fused image preview", "INFO");
        setIsFusing(true);
        setImageLoaded(false); //reset to show spinner for new preview
        try {
            const token = await user.getIdToken();
            const res = await fetch(`${API_BASE}/api/fuse-image`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    imageUrl: data.storageUrl,
                    caption: caption
                })
            });

            const result = await res.json();

            // This is now a Base64 string (Data URI)
            setFusedImageUrl(result.fusedImage);

        } catch (e) {
            console.error(e);
            logToCloud("Fuse preview generation failed", "ERROR", { error: e.message });
            showToast({ message: "Failed to generate preview", type: "error" });
        } finally {
            //Stops the spinner of fused image section
            setIsFusing(false);
        }
    };

    // 5. Download Fused Image
    const handleDownload = async () => {
        if (!fusedImageUrl) return;

        // Track the event: User downloaded fused image (Conversion Success)
        ReactGA.event({
            category: "Conversion",
            action: "Download Fused Image",
            label: "Success"
        });
        logToCloud("User downloading image", "INFO", {
            type: fusedImageUrl.startsWith("data:") ? "preview" : "saved_url"
        });


        // If it's a Base64 string (Preview i.e not yet saved), we can download directly via <a> tag
        if (fusedImageUrl.startsWith("data:")) {
            const a = document.createElement("a");
            a.href = fusedImageUrl;
            a.download = "fused-preview.jpg";
            document.body.appendChild(a);
            a.click();
            a.remove();
            return;
        }

        // If it's a remote URL (Saved to DB), use the existing fetch blob logic
        try {
            const resp = await fetch(fusedImageUrl);
            const blob = await resp.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "fused-image.jpg";
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (e) {
            // If download fails, fallback to opening in new tab
            window.open(fusedImageUrl, "_blank");
        }
    };


    if (loading) return <div className="p-5 text-center">Loading...</div>;
    if (!data) return <div className="p-5 text-center">Image not found</div>;

    return (
        <div className="cf-page">
            <Toast
                message={toast.message}
                type={toast.type}
                onClose={() => setToast({ ...toast, message: null })}
            />
            <main className="cf-main container py-4">
                {/* Back Button */}
                <button onClick={() => navigate('/dashboard')} className="btn btn-link text-decoration-none mb-3 ps-0">
                    <ArrowLeft size={16} /> Back to Dashboard
                </button>

                <section className="cf-grid row">
                    {/* LEFT COLUMN: IMAGES */}
                    <div className="cf-left col-md-6">
                        {/* Original (Selected Crop) */}
                        <figure className="cf-photo mb-3">
                            <img src={data.storageUrl} alt="Original Crop" className="img-fluid rounded shadow-sm" />
                        </figure>

                        {/* Fused Result Area */}
                        <div className="cf-photo-fused p-3 bg-light rounded border text-center d-flex flex-column justify-content-center align-items-center" style={{ minHeight: '200px' }}>

                            {/* CASE 1: Backend is working on generating fused images*/}
                            {isFusing && (
                                <div className="spinner-border text-primary"></div>
                            )}

                            {/* CASE 2: We have an image URL (Preview or Saved) */}
                            {!isFusing && fusedImageUrl && (
                                <>
                                    <img
                                        src={fusedImageUrl}
                                        alt="Fused Result"
                                        className="img-fluid rounded mb-2"
                                        // 1. If loaded, show it. If not, hide it (but keep in DOM to trigger onLoad)
                                        style={{ display: imageLoaded ? 'block' : 'none' }}
                                        onLoad={() => setImageLoaded(true)}
                                        onError={() => {
                                            console.error("Failed to load image");
                                            setImageLoaded(false);
                                            setFusedImageUrl(null); // Reset if broken to show empty state
                                        }}
                                    />

                                    {/* 2. Spinner: Only show if we have a URL but browser hasn't finished rendering */}
                                    {!imageLoaded && (
                                        <div className="text-muted small">
                                            <div className="spinner-border spinner-border-sm text-secondary me-2"></div>
                                            Rendering...
                                        </div>
                                    )}

                                    {/* 3. Download Button: Only after fused image is fully loaded */}
                                    {imageLoaded && (
                                        <button onClick={handleDownload} className="btn btn-sm btn-outline-primary mt-2 animate-fade-in">
                                            <Download size={14} className="me-1" /> Download Image
                                        </button>
                                    )}
                                </>
                            )}

                            {/* CASE 3: No URL and Not Processing -> Empty State */}
                            {!isFusing && !fusedImageUrl && (
                                <p className="text-muted mt-3 mb-0">Fused image will appear here</p>
                            )}

                        </div>
                    </div>

                    {/* RIGHT COLUMN: EDITING PANEL */}
                    <div className="cf-right col-md-6">
                        <div className="cf-panel bg-white p-4 rounded shadow-sm h-100">

                            {/* Caption Display/Edit */}
                            <div className="mb-3">
                                <label className="form-label fw-bold">Caption</label>
                                <textarea
                                    className="form-control"
                                    rows="2"
                                    value={caption}
                                    onChange={(e) => setCaption(e.target.value)}
                                />
                            </div>

                            {/* Narrative Display */}
                            <div className="mb-4">
                                <label className="form-label fw-bold">Narrative</label>
                                <div className="p-3 bg-light rounded border" style={{ maxHeight: '150px', overflowY: 'auto' }}>
                                    {narrative}
                                </div>
                            </div>

                            {/* AI Input */}
                            <div className="mb-3">
                                <label className="form-label text-muted small">Ask AI to change tone/style</label>
                                <div className="input-group">
                                    <input
                                        type="text"
                                        className="form-control"
                                        placeholder="e.g., make it funnier, shorter..."
                                        value={userInstruction}
                                        onChange={(e) => setUserInstruction(e.target.value)}
                                    />
                                    <button
                                        className="btn btn-outline-primary"
                                        onClick={handleRefine}
                                        disabled={isRefining || !userInstruction}
                                    >
                                        {isRefining ? '...' : <Wand2 size={16} />}
                                    </button>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="d-flex gap-2 mt-4 pt-3 border-top">
                                <button
                                    className="btn btn-success flex-grow-1"
                                    onClick={handleSave}
                                >
                                    <Save size={16} className="me-2" /> Save Changes
                                </button>

                                <button
                                    className="btn btn-primary flex-grow-1"
                                    onClick={handleFuse}
                                    disabled={isFusing}
                                >
                                    Fuse Image
                                </button>
                            </div>

                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
}