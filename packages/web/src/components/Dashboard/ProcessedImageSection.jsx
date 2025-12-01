import { useState } from "react";
import { useNavigate } from "react-router-dom"; // 1. Import useNavigate hook

// Section-3: All images (cropped) are stored permanently and can be accessed by a public URL.
export default function ProcessedImageSection({ processed }) {
    const navigate = useNavigate(); // 2. Initialize the hook

    const [selectedLabel, setSelectedLabel] = useState("All");
    const [selectedMood, setSelectedMood] = useState("All");

    const allLabels = Array.from(new Set(processed.flatMap((p) => p.labels || [])));
    const allMoods = Array.from(new Set(processed.flatMap((p) => p.moods || [])));

    const filtersApplied =
        (selectedLabel !== "All" ? 1 : 0) + (selectedMood !== "All" ? 1 : 0);

    const filtered = processed.filter((p) => {
        const matchesLabel = selectedLabel === "All" || (p.labels || []).includes(selectedLabel);
        const matchesMood = selectedMood === "All" || (p.moods || []).includes(selectedMood);
        return matchesLabel && matchesMood;
    });

    const clearFilters = () => {
        setSelectedLabel("All");
        setSelectedMood("All");
    };


    //keeping this check here is good practice for standalone usage.
    if (processed.length === 0) return null;

    return (
        <section className="card shadow-sm mt-3">
            <div className="card-body">
                {/* Filter row */}
                <div className="d-flex flex-wrap align-items-center gap-2 mb-3">
                    <select
                        value={selectedLabel}
                        onChange={(e) => setSelectedLabel(e.target.value)}
                        className="form-select w-auto"
                    >
                        <option value="All">All Labels</option>
                        {allLabels.map((label) => (
                            <option key={label} value={label}>{label}</option>
                        ))}
                    </select>

                    <select
                        value={selectedMood}
                        onChange={(e) => setSelectedMood(e.target.value)}
                        className="form-select w-auto"
                    >
                        <option value="All">All Moods</option>
                        {allMoods.map((mood) => (
                            <option key={mood} value={mood}>{mood}</option>
                        ))}
                    </select>

                    <button onClick={clearFilters} className="btn btn-primary">
                        Clear Filters
                    </button>

                    {filtersApplied > 0 && (
                        <span className="text-muted small ms-1">Filters applied: {filtersApplied}</span>
                    )}
                </div>

                {/* No records exist after filtering */}
                {filtered.length === 0 && (
                    <p className="text-muted mb-2">No results match the selected filters.</p>
                )}

                <div className="row g-3 g-sm-4">
                    {filtered.map((p) => (
                        <div key={p.id} className="col-12 col-sm-6 col-lg-4">
                            <div
                                className="bg-light rounded-3 overflow-hidden shadow-sm h-100 position-relative hover-shadow-lg transition"
                                // 3. Add Click Handler
                                onClick={() => navigate(`/refine/${p.id}`)}
                                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                            >
                                {/* Overlay hint on hover */}
                                <div className="position-absolute top-0 end-0 p-2 opacity-0 hover-opacity-100 transition-opacity">
                                    <span className="badge bg-primary shadow-sm">Edit & Refine</span>
                                </div>

                                <img
                                    src={p.url}
                                    alt=""
                                    className="w-100"
                                    style={{ height: 208, objectFit: "cover" }}
                                    loading="lazy"
                                />

                                <div className="p-3">
                                    <p className="fw-semibold mb-1">{p.caption || "Caption not generated"}</p>
                                    <p className="text-muted mb-1">
                                        <b>Labels:</b> {(p.labels || []).slice(0, 3).join(", ")}
                                        {/* Truncate labels visually if there are too many */}
                                        {(p.labels?.length > 3) && "..."}
                                    </p>
                                    <p className="text-muted mb-0">
                                        <b>Moods:</b> {(p.moods || []).join(", ")}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}