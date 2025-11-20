// import { useState } from "react";
// // import HeaderBar from "./Dashboard/HeaderBar";
// import RawImageSection from "./Dashboard/RawImageSection";
// import ProcessedImageSection from "./Dashboard/ProcessedImageSection";

// //Segregation of processed and unprocessed photos
// function analyzePhoto(p) {
//     const name = String(p.url || "").toLowerCase();

//     //Sample analyses based on image name
//     //Golden Retriever
//     if (name.includes("golden_retriever"))
//         return {
//             ...p,
//             caption: "A playful moment captured perfectly in sunlight.",
//             labels: ["dog", "outdoor", "happy"],
//             moods: ["joyful", "curious"],
//         };

//     //Cat Sleeping
//     if (name.includes("cat_sleeping"))
//         return {
//             ...p,
//             caption: "Serenity and warmth blend in this cozy frame.",
//             labels: ["cat", "relaxed", "cozy"],
//             moods: ["calm", "dreamy"],
//         };

//     //Rabbit
//     if (name.includes("rabbit_grass"))
//         return {
//             ...p,
//             caption: "An adorable face that says a thousand stories.",
//             labels: ["rabbit", "grass", "gentle"],
//             moods: ["energetic", "playful"],
//         };

//     //Puppy
//     if (name.includes("puppy_smile"))
//         return {
//             ...p,
//             caption: "Colors and curiosity come alive beautifully.",
//             labels: ["dog", "puppy", "playful"],
//             moods: ["soft", "friendly"],
//         };

//     //Parrot
//     if (name.includes("parrot_blue"))
//         return {
//             ...p,
//             caption: "Energy, joy, and innocence frozen in time.",
//             labels: ["parrot", "bird", "colorful"],
//             moods: ["joyful", "curious"],
//         };

//     //Default (fallback)
//     return {
//         ...p,
//         caption: "A beautiful moment captured in natural light.",
//         labels: ["photo"],
//         moods: ["pleasant"],
//     };
// }

// export default function Dashboard() {
//     const initialPhotos = [
//         { id: "1", url: "/images/golden_retriever.jpg", name: "Golden Retriever" },
//         { id: "2", url: "/images/cat_sleeping.jpg", name: "Cat Sleeping" },
//         { id: "3", url: "/images/rabbit_grass.jpg", name: "Rabbit" },
//         { id: "4", url: "/images/puppy_smile.jpg", name: "Puppy" },
//         { id: "5", url: "/images/parrot_blue.jpg", name: "Parrot" },
//     ];

//     //make raw mutable so we can remove processed images
//     const [raw, setRaw] = useState(initialPhotos);
//     const [selectedIds, setSelectedIds] = useState(new Set());
//     const [processed, setProcessed] = useState([]);
//     const [loading, setLoading] = useState(false);

//     const toggleOne = (id) => {
//         setSelectedIds((prev) => {
//             const next = new Set(prev);
//             next.has(id) ? next.delete(id) : next.add(id);
//             return next;
//         });
//     };

//     const toggleAll = () => {
//         setSelectedIds((prev) =>
//             prev.size === raw.length ? new Set() : new Set(raw.map((r) => r.id))
//         );
//     };

//     const handleProcess = () => {
//         if (selectedIds.size === 0) return;
//         setLoading(true);

//         setTimeout(() => {
//             // compute before mutating raw
//             const chosen = raw.filter((r) => selectedIds.has(r.id));
//             const results = chosen.map(analyzePhoto);

//             //append to bottom section
//             setProcessed((prev) => {
//                 const next = [...prev, ...results];
//                 window.latestProcessed = next;
//                 return next;
//             });

//             //remove processed from the top section
//             setRaw((prev) => prev.filter((p) => !selectedIds.has(p.id)));

//             // clear selection and loading state
//             setSelectedIds(new Set());
//             setLoading(false);
//         }, 400);
//     };

//     return (
//         <div className="min-vh-100 bg-light">
//             {/* <HeaderBar /> */}
//             <main className="container py-4">
//                 <RawImageSection
//                     photos={raw}
//                     selectedIds={selectedIds}
//                     onToggleOne={toggleOne}
//                     onToggleAll={toggleAll}
//                     onProcess={handleProcess}
//                 />

//                 {!loading && processed.length === 0 && (
//                     <section className="card shadow-sm mt-3">
//                         <div className="card-body text-center text-muted">
//                             No generated captions yet — select photos above and click <b>Generate</b>.
//                         </div>
//                     </section>
//                 )}

//                 {loading && (
//                     <div className="text-center text-muted mt-3">
//                         <div className="spinner-border spinner-border-sm me-2" role="status" />
//                         Generating captions…
//                     </div>
//                 )}

//                 {!loading && processed.length > 0 && (
//                     <ProcessedImageSection processed={processed} />
//                 )}
//             </main>
//         </div>
//     );
// }


// packages/web/src/components/Dashboard.jsx
import { useEffect, useState } from "react";
import RawImageSection from "./Dashboard/RawImageSection";
import ProcessedImageSection from "./Dashboard/ProcessedImageSection";
import { auth } from "./auth/firebase";

const API_BASE = "http://localhost:3000"; // your API origin

export default function Dashboard() {
    // upper grid (raw Google Photos items), but shaped for your component
    // each item keeps the original Google Photos fields in _gh
    const [raw, setRaw] = useState([]);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [processed, setProcessed] = useState([]);

    const [loadingPhotos, setLoadingPhotos] = useState(false);
    const [loadingGenerate, setLoadingGenerate] = useState(false);
    const [nextPageToken, setNextPageToken] = useState(null);
    const [error, setError] = useState("");

    // --- Load first page on mount ---
    useEffect(() => {
        loadPhotos();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadPhotos(pageToken) {
        try {
            setLoadingPhotos(true);
            setError("");

            const r = await fetch(`${API_BASE}/api/photos`, { credentials: "include" });

            // Handle 401 (Not Logged In) AND 403 (Forbidden/Scope Issue)
            if (r.status === 401 || r.status === 403) {
                // Redirect user to restart the OAuth flow
                window.location.href = `${API_BASE}/auth/google`;
                return;
            }

            if (!r.ok) {
                const msg = await r.text();
                console.error("api/photos failed", r.status, msg);
                setError("Failed to load photos.");
                return;
            }

            const data = await r.json();


            // adapt to your RawImageSection shape
            const mapped = (data.items || []).map((it) => ({
                id: it.id,
                name: it.filename,
                url: it.thumbUrl || `${it.baseUrl}=w512-h512`,
                _gh: it, // keep the full google-photos item for processing
            }));
            setRaw((prev) => [...prev, ...mapped]);
            setNextPageToken(data.nextPageToken || null);
        } catch (e) {
            console.error(e);
            setError("Failed to load photos.");
        } finally {
            setLoadingPhotos(false);
        }
    }

    // --- Selection helpers for the upper grid ---
    const toggleOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleAll = () => {
        setSelectedIds((prev) =>
            prev.size === raw.length ? new Set() : new Set(raw.map((r) => r.id))
        );
    };

    // --- Generate: send only selected photos to backend ---
    async function handleProcess() {
        if (selectedIds.size === 0) return;

        try {
            setLoadingGenerate(true);
            setError("");

            // gather selected payload (only fields the API needs)
            const selected = raw.filter((r) => selectedIds.has(r.id));
            const payloadItems = selected.map((r) => {
                const it = r._gh;
                return {
                    id: it.id,
                    filename: it.filename,
                    mimeType: it.mimeType,
                    baseUrl: it.baseUrl,
                    productUrl: it.productUrl,
                    width: it.width,
                    height: it.height,
                    createTime: it.createTime,
                };
            });

            // Firebase auth -> ID token for user identification (uid)
            const idToken = await auth.currentUser?.getIdToken();
            if (!idToken) {
                setError("Please sign in first.");
                return;
            }

            const resp = await fetch(`${API_BASE}/api/process`, {
                method: "POST",
                credentials: "include", // keep Google session
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ items: payloadItems }), // optionally add petName/prompt
            });

            if (!resp.ok) {
                const msg = await resp.text();
                throw new Error(`process ${resp.status} ${msg}`);
            }
            const data = await resp.json(); // { processed: [{id,url,caption,labels,moods}, ...] }

            // add to bottom grid
            setProcessed((prev) => {
                const next = [...prev, ...(data.processed || [])];
                window.latestProcessed = next; // for your CSV button
                return next;
            });

            // remove processed from upper grid
            const processedIds = new Set((data.processed || []).map((p) => p.id));
            setRaw((prev) => prev.filter((p) => !processedIds.has(p.id)));

            // clear selection
            setSelectedIds(new Set());
        } catch (e) {
            console.error(e);
            setError("Failed to generate captions/labels.");
        } finally {
            setLoadingGenerate(false);
        }
    }

    return (
        <div className="min-vh-100 bg-light">
            <main className="container py-4">
                {/* Top: Photos + actions */}
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <h2 className="h5 mb-0">Photo Gallery</h2>
                    <div className="d-flex gap-2">
                        {nextPageToken && (
                            <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => loadPhotos(nextPageToken)}
                                disabled={loadingPhotos}
                            >
                                {loadingPhotos ? "Loading…" : "Load more"}
                            </button>
                        )}
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={handleProcess}
                            disabled={selectedIds.size === 0 || loadingGenerate}
                        >
                            {loadingGenerate ? "Generating…" : "Generate"}
                        </button>
                    </div>
                </div>

                <RawImageSection
                    photos={raw}
                    selectedIds={selectedIds}
                    onToggleOne={toggleOne}
                    onToggleAll={toggleAll}
                    onProcess={handleProcess} // (kept for compatibility; you also have the button above)
                />

                {/* Status / errors */}
                {error && (
                    <div className="alert alert-danger mt-3" role="alert">
                        {error}
                    </div>
                )}

                {!loadingGenerate && processed.length === 0 && (
                    <section className="card shadow-sm mt-3">
                        <div className="card-body text-center text-muted">
                            No generated captions yet — select photos above and click <b>Generate</b>.
                        </div>
                    </section>
                )}

                {loadingGenerate && (
                    <div className="text-center text-muted mt-3">
                        <div className="spinner-border spinner-border-sm me-2" role="status" />
                        Generating captions…
                    </div>
                )}

                {!loadingGenerate && processed.length > 0 && (
                    <ProcessedImageSection processed={processed} />
                )}
            </main>
        </div>
    );
}
