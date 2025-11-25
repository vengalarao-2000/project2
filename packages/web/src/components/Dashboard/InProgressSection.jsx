//Section-2: Images are stored in a session and deleted when user logs out
import React from "react";
import { useNavigate } from "react-router-dom";

export default function InProgressSection({ items }) {
    const navigate = useNavigate();

    if (items.length === 0) return null;

    return (
        <section className="card shadow-sm mt-3 mb-5 border-warning">
            <div className="card-body bg-warning bg-opacity-10">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2 className="h5 mb-0 text-dark">
                        Pending Review <span className="badge bg-warning text-dark ms-2">{items.length}</span>
                    </h2>
                    <span className="small text-muted">Click an item to view renditions</span>
                </div>

                <div className="row g-3 g-sm-4">
                    {items.map((item) => {
                        if (item.status === 'analyzing') {
                            return (
                                <div key={item.id} className="col-12 col-sm-6 col-lg-4">
                                    <div className="bg-white rounded-3 shadow-sm h-100 p-4 text-center d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '300px' }}>
                                        <div className="spinner-border text-primary mb-3"></div>
                                        <p className="text-muted small mb-0">Analyzing image...</p>
                                    </div>
                                </div>
                            );
                        }

                        // Use square or original as thumbnail
                        const displayUrl = item.renditions?.square || item.renditions?.original || item.url;

                        return (
                            <div key={item.id} className="col-12 col-sm-6 col-lg-4">
                                <div
                                    className="bg-white rounded-3 overflow-hidden shadow-sm h-100 cursor-pointer position-relative hover-shadow-lg transition"
                                    // --- REDIRECT TO RENDITIONS PAGE ---
                                    onClick={() => navigate(`/review/${item.id}`)}
                                // -----------------------------------
                                >
                                    <div className="position-absolute top-0 end-0 p-2">
                                        <span className="badge bg-warning text-dark shadow-sm">Action Required</span>
                                    </div>

                                    <img
                                        src={displayUrl}
                                        alt=""
                                        className="w-100"
                                        style={{ height: 208, objectFit: "cover" }}
                                    />

                                    <div className="p-3">
                                        <p className="fw-semibold mb-2 text-truncate-2-lines" style={{ minHeight: '3em' }}>
                                            {item.aiData?.caption || "Caption generated..."}
                                        </p>
                                        <p className="text-primary small fw-bold mb-0">
                                            Click to see renditions &rarr;
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}