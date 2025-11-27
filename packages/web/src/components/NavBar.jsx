import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

export function NavBar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await logout();
            navigate("/signin");
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-white sticky-top border-bottom">
            <div className="container">
                {/* Brand */}
                <a className="navbar-brand fw-bold d-flex align-items-center" href={user ? "/dashboard" : "/home.html"}>
                    <img src="/assets/images/logo_pap.png" height="32" className="me-2" alt="Paws & Pixels" />
                    <span>Paws & Pixels</span>
                </a>

                {/* Mobile Toggle */}
                {!user && (
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                )}

                {/* Signed Out Links */}
                {!user && (
                    <div id="nav" className="collapse navbar-collapse">
                        <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
                            <li className="nav-item"><a className="nav-link" href="/home.html">Home</a></li>
                            <li className="nav-item"><a className="nav-link" href="/about.html">About</a></li>
                            <li className="nav-item"><a className="nav-link" href="/contact.html">Contact Us</a></li>
                            <li className="nav-item"><a className="btn btn-primary ms-lg-2 px-4" href="/signin">Sign in</a></li>
                        </ul>
                    </div>
                )}

                {/* User Profile Section (Right Aligned) */}
                {user && (
                    <div className="ms-auto d-flex align-items-center">
                        <div className="dropdown">
                            {/* Profile Trigger Button */}
                            <button
                                className="btn p-0 border-0"
                                type="button"
                                data-bs-toggle="dropdown"
                                aria-expanded="false"
                            >
                                {user.photoURL ? (
                                    <img
                                        src={user.photoURL}
                                        alt="Profile"
                                        className="rounded-circle border shadow-sm"
                                        width="40"
                                        height="40"
                                        style={{ objectFit: "cover" }}
                                    />
                                ) : (
                                    // Fallback if no photo URL exists
                                    <div
                                        className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center shadow-sm"
                                        style={{ width: "40px", height: "40px" }}
                                    >
                                        <span className="fw-bold fs-5">
                                            {(user.displayName || user.email || "U").charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </button>

                            {/* Dropdown Menu */}
                            <ul
                                className="dropdown-menu dropdown-menu-end shadow-lg border-0 mt-2 p-2 rounded-3"
                                style={{ minWidth: "240px" }}
                            >
                                {/* 1. User Info Header*/}
                                <li>
                                    <div
                                        className="dropdown-item d-flex align-items-center gap-2 p-2 rounded-2 mb-2 bg-light"
                                        style={{ cursor: "pointer" }}
                                        onClick={() => navigate("/profile")}
                                    >
                                        {user.photoURL && (
                                            <img
                                                src={user.photoURL}
                                                width="32" height="32"
                                                className="rounded-circle"
                                                alt=""
                                            />
                                        )}
                                        <div className="d-flex flex-column overflow-hidden">
                                            <span className="fw-bold text-dark text-truncate" style={{ fontSize: '0.9rem' }}>
                                                {user.displayName || "My Profile"}
                                            </span>
                                            <span className="text-muted text-truncate" style={{ fontSize: '0.75rem' }}>
                                                {user.email}
                                            </span>
                                        </div>
                                    </div>
                                </li>

                                {/* 2. Standard Links */}
                                <li>
                                    <button className="dropdown-item rounded-2 py-2" onClick={() => navigate("/dashboard")}>
                                        <i className="bi bi-grid me-2 text-secondary"></i> Studio Dashboard
                                    </button>
                                </li>

                                <li><hr className="dropdown-divider my-1" /></li>

                                {/* 3. Logout */}
                                <li>
                                    <button
                                        className="dropdown-item rounded-2 py-2 text-danger"
                                        onClick={handleLogout}
                                    >
                                        <i className="bi bi-box-arrow-right me-2"></i> Sign Out
                                    </button>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
}