import ProtectedImages from "./ProtectedImages";

export default function RawImageSection({
    photos,
    selectedIds,
    onToggleOne,
    onToggleAll,
}) {
    const allSelected = selectedIds.size === photos.length && photos.length > 0;

    return (
        <section className="bg-white rounded shadow p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
                {/* Only show Select All if there are photos */}
                {photos.length > 0 && (
                    <div className="d-flex justify-content-end w-100">
                        <button
                            onClick={onToggleAll}
                            className="px-3 py-2 btn btn-light border text-sm fw-medium"
                            type="button"
                        >
                            {allSelected ? "Deselect All" : "Select All"}
                        </button>
                    </div>
                )}
            </div>

            {photos.length > 0 ? (
                <div className="row g-3">
                    {photos.map((p) => {
                        const isSelected = selectedIds.has(p.id);

                        // 1. Determine the Image URL
                        // Firestore might store it as 'base64' (local), 'thumbUrl' (google), or 'url'
                        const imageUrl = p.base64 || p.thumbUrl || p.url || p.baseUrl;

                        // 2. Determine the Source Type
                        // Check explicit source field OR if the URL is a data URI
                        const isLocal = (p.source === 'local') || (imageUrl && imageUrl.startsWith("data:"));

                        return (
                            <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                                <div
                                    onClick={() => onToggleOne(p.id)}
                                    className={`position-relative rounded overflow-hidden shadow-sm hover-shadow-md transition ${isSelected ? "border border-4 border-primary" : ""
                                        }`}
                                    style={{
                                        cursor: "pointer",
                                        transform: isSelected ? "scale(1.04)" : undefined,
                                        borderRadius: "1.25rem"
                                    }}
                                >
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => onToggleOne(p.id)}
                                        className="form-check-input position-absolute top-0 start-0 m-3"
                                        style={{ zIndex: 10, height: 20, width: 20 }}
                                        onClick={(e) => e.stopPropagation()}
                                    />

                                    {/* CONDITIONAL RENDERING */}
                                    {isLocal ? (
                                        // 1. Local File: Standard Image Tag (No Proxy)
                                        <img
                                            src={imageUrl}
                                            alt={p.filename || p.name || "upload"}
                                            className="w-100"
                                            style={{
                                                height: "13rem",
                                                objectFit: "cover",
                                                opacity: isSelected ? 0.85 : 1,
                                                transition: "opacity 0.3s"
                                            }}
                                        />
                                    ) : (
                                        // 2. Google Photo: Use Proxy Component
                                        <ProtectedImages
                                            src={imageUrl}
                                            alt={p.filename || p.name || "google photo"}
                                            className="w-100"
                                            style={{
                                                height: "13rem",
                                                objectFit: "cover",
                                                opacity: isSelected ? 0.85 : 1,
                                                transition: "opacity 0.3s"
                                            }}
                                        />
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="d-flex justify-content-center align-items-center text-muted" style={{ height: "10rem" }}>
                    <p className="mb-0">
                        No photos selected. Click <b>"Pick from Google Photos"</b> or <b>"Upload File"</b> above to start.
                    </p>
                </div>
            )}
        </section>
    );
}