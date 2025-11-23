import { useState } from "react";

//Section-3: All images (cropped) are stored permanently and can be accessed by a public URL.
//here use <img> tag instead of ProtectedImage as we are retrieving the image using public URL on storage bucket in firestore.
export default function ProcessedImageSection({ processed }) {
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

    if (processed.length === 0) {
        return (
            <section className="card shadow-sm mt-3">
                <div className="card-body">
                    <h2 className="h5 mb-2">Generated Results</h2>
                    <p className="text-muted mb-0">
                        No generated captions yet — select photos above and click <b>Generate</b>.
                    </p>
                </div>
            </section>
        );
    }

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

                {/* no records exist after filtering */}
                {filtered.length === 0 && (
                    <p className="text-muted mb-2">No results match the selected filters.</p>
                )}

                <div className="row g-3 g-sm-4">
                    {filtered.map((p) => (
                        <div key={p.id} className="col-12 col-sm-6 col-lg-4">
                            <div className="bg-light rounded-3 overflow-hidden shadow-sm h-100">
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
                                        <b>Labels:</b> {(p.labels || []).join(", ")}
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