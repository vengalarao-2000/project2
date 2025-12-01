import React from "react";

export function Toast({ message, type = "error", onClose }) {
    if (!message) return null;

    // Determine background color based on type
    // "error" -> bg-danger (Red)
    // "success" -> bg-success (Green)
    const bgClass = type === "error" ? "bg-danger" : "bg-success";

    return (
        <div
            className={`position-fixed top-0 start-50 translate-middle-x mt-4 p-3 rounded shadow-sm text-white ${bgClass}`}
            style={{ zIndex: 1055, opacity: 0.95, transition: 'opacity 0.5s' }}
        >
            <div className="d-flex align-items-center gap-2">
                <span>{message}</span>
                <button
                    onClick={onClose}
                    className="btn-close btn-close-white btn-sm"
                ></button>
            </div>
        </div>
    );
}