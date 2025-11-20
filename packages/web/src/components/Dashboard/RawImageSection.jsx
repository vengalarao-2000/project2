export default function RawImageSection({
    photos,
    selectedIds,
    onToggleOne,
    onToggleAll,
    onProcess,
    onAddMore,
}) {
    const allSelected = selectedIds.size === photos.length && photos.length > 0;

    return (
        <section className="bg-white rounded shadow p-4">
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-4">
                <h2 className="fs-5 fs-md-4 fw-semibold text-dark mb-2 mb-lg-0">
                    Photo Gallery
                </h2>

                {photos.length > 0 && (
                    <div className="d-flex gap-2">
                        <button
                            onClick={onToggleAll}
                            className="px-3 py-2 btn btn-light border text-sm fw-medium"
                            type="button"
                        >
                            {allSelected ? "Deselect All" : "Select All"}
                        </button>

                        <button
                            onClick={onProcess}
                            disabled={selectedIds.size === 0}
                            className={`px-3 py-2 btn text-sm fw-medium transition ${selectedIds.size === 0
                                ? "btn-secondary disabled"
                                : "btn-primary"
                                }`}
                            type="button"
                        >
                            Generate
                        </button>
                    </div>
                )}
            </div>

            {photos.length === 0 ? (
                <div className="d-flex justify-content-center align-items-center" style={{ height: "10rem" }}>
                    <button
                        onClick={onAddMore}
                        className="px-4 py-2 btn btn-primary fw-medium"
                        type="button"
                    >
                        + Add more from Google Photos
                    </button>
                </div>
            ) : (
                <div className="row g-3">
                    {photos.map((p) => {
                        const isSelected = selectedIds.has(p.id);
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
                                    <img
                                        src={p.url}
                                        alt={p.name}
                                        className="w-100"
                                        style={{
                                            height: "13rem",
                                            objectFit: "cover",
                                            opacity: isSelected ? 0.85 : 1,
                                            transition: "opacity 0.3s"
                                        }}
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </section>
    );
}
