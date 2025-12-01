import React, { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Download, Eye, ArrowLeft } from "lucide-react";
import "../styles/renditions.min.css";
import { db } from "./auth/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useAuth } from "./auth/AuthContext";
import Syncing from "./Syncing";
import { logToCloud } from "../utils/logger";

// dev: hit local api; prod: same origin as frontend (empty prefix)
const API_BASE = import.meta.env.DEV ? "http://localhost:3000" : "";

export default function Renditions() {
    const { id } = useParams(); // Get session ID from URL
    const { user } = useAuth();
    const navigate = useNavigate();

    const [item, setItem] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // 1. Fetch Data
    useEffect(() => {
        if (!user || !id) return;
        async function fetchData() {
            try {
                // Check session_items collection
                const docRef = doc(db, `users/${user.uid}/session_items/${id}`);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setItem({ id: snap.id, ...snap.data() });
                    logToCloud("Renditions page loaded successfully", "INFO", {
                        sessionId: id,
                        source: "session_items"
                    });
                } else {
                    // Fallback: check permanent photos if user is revisiting
                    const permRef = doc(db, `users/${user.uid}/photos/${id}`);
                    const permSnap = await getDoc(permRef);
                    if (permSnap.exists()) setItem({ id: permSnap.id, ...permSnap.data() });
                    logToCloud("Renditions page loaded (Reviewing history)", "INFO", {
                        sessionId: id,
                        source: "photos"
                    });
                }
            } catch (e) {
                console.error(e);
                logToCloud("Failed to fetch rendition data", "ERROR", { error: e.message });
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [user, id]);

    // 2. Finalize Selection Logic (Save to Permanent DB)
    const handleSelect = async (cropType) => {
        setSaving(true);
        logToCloud("User selecting crop", "INFO", {
            sessionId: id,
            cropType: cropType
        });
        try {
            const idToken = await user.getIdToken();
            // Call your backend API to finalize
            const res = await fetch(`${API_BASE}/api/finalize`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${idToken}`
                },
                body: JSON.stringify({ sessionId: id, selectedCrop: cropType }),
            });

            if (res.ok) {
                logToCloud("Crop finalized successfully", "INFO");
                navigate('/dashboard'); // Go back to dashboard
            }
        } catch (e) {
            console.error(e);
            logToCloud("Failed to finalize crop selection", "ERROR", { error: e.message });
        } finally {
            setSaving(false);
        }
    };

    // 3. Helper to build cards from data
    const cards = useMemo(() => {
        if (!item || !item.renditions) return [];
        //4 Rendition types with aspect ratios
        const base = [
            { id: "square", w: 1, h: 1, label: "1:1 • Square" },
            { id: "portrait", w: 4, h: 5, label: "4:5 • Portrait" },
            { id: "landscape", w: 16, h: 9, label: "16:9 • Landscape" },
            { id: "story", w: 9, h: 16, label: "9:16 • Story" },
        ];
        // Map to include actual URLs and computed widths
        return base.map(r => ({
            ...r,
            src: item.renditions[r.id], // Get real URL from backend data
            // Helper for card width logic (reused from your code)
            cardWidth: Math.max(260, Math.min(520, Math.round(Math.sqrt(90000 * (r.w / r.h))))),
            aspect: `${r.w} / ${r.h}`
        }));
    }, [item]);

    if (loading) return <Syncing />;
    if (!item) return <div className="p-5 text-center">Item not found</div>;

    return (
        <div className="rd-page">
            <main className="rd-main">
                <section className="rd-hero">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-link text-decoration-none mb-3">
                        <ArrowLeft size={16} /> Back to Dashboard
                    </button>
                    <h1 className="rd-title">Smart auto-crop &amp; social renditions</h1>
                    <p className="rd-subtitle">
                        Generated Caption: "{item.aiData?.caption}"
                    </p>
                </section>

                <section className="rd-renditions">
                    {cards.map((c) => (
                        <article
                            key={c.id}
                            className="rd-card"
                            style={{ width: `${c.cardWidth}px` }}
                        >
                            <div className="rd-media" style={{ aspectRatio: c.aspect }}>
                                <img
                                    src={c.src}
                                    alt={c.label}
                                    style={{ objectFit: "cover" }}
                                />
                            </div>

                            <div className="rd-caption">{c.label}</div>

                            <div className="rd-actions">
                                <button
                                    className="rd-btn"
                                    onClick={() => {
                                        logToCloud("User viewed raw crop", "INFO", { crop: c.id });
                                        window.open(c.src, "_blank");
                                    }}
                                >
                                    <Eye size={16} /> View
                                </button>

                                <button
                                    className="rd-btn rd-btn-primary"
                                    disabled={saving}
                                    onClick={() => handleSelect(c.id)}
                                >
                                    {saving ? "Saving..." : "Select"}
                                </button>
                            </div>
                        </article>
                    ))}
                </section>
            </main>
        </div>
    );
}