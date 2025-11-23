export function Toast({ message, onClose }) {
    if (!message) return null;

    return (
        <div
            className="position-fixed top-0 start-50 translate-middle-x mt-4 p-3 rounded shadow-sm text-white bg-danger"
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