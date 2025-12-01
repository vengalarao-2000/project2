import { useState, useEffect } from "react";

// dev: hit local api; prod: same origin as frontend (empty prefix)
const API_BASE = import.meta.env.DEV ? "http://localhost:3000" : "";

//Images in Section-1 are accessed by the URL provided by Google Photos Picker API so this component calls the URL with required authorization headers and tokens
export default function ProtectedImage({ src, alt, className, style }) {
    const [imageUrl, setImageUrl] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let isMounted = true;

        async function loadImage() {
            if (!src) return;

            // If it's already a base64 string (just in case logic slips through), use it directly
            if (src.startsWith("data:")) {
                setImageUrl(src);
                return;
            }

            try {
                // Call Proxy
                const proxyUrl = `${API_BASE}/api/proxy-image?url=${encodeURIComponent(src)}`;

                const response = await fetch(proxyUrl, {
                    credentials: "include" //Sends the session cookie
                });

                if (response.ok) {
                    const blob = await response.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    if (isMounted) setImageUrl(objectUrl);
                } else {
                    console.error("Proxy failed:", response.status);
                    setError(true);
                }
            } catch (e) {
                console.error("Image load error", e);
                setError(true);
            }
        }

        loadImage();

        return () => {
            isMounted = false;
            if (imageUrl && !imageUrl.startsWith("data:")) {
                URL.revokeObjectURL(imageUrl);
            }
        };
    }, [src]);

    if (error) {
        // Fallback UI for broken images
        return (
            <div className={className} style={{ ...style, backgroundColor: "#f8f9fa", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span className="text-muted small">Image Unavailable</span>
            </div>
        );
    }

    if (!imageUrl) {
        // Loading state
        return <div className={className} style={{ ...style, backgroundColor: "#eee" }} />;
    }

    return <img src={imageUrl} alt={alt} className={className} style={style} />;
}