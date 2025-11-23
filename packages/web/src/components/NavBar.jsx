import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth/AuthContext";

export function NavBar() {
    // 1. Destructure 'logout' from the context
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // 2. Create a handler that calls the context logout
    const handleLogout = async () => {
        try {
            await logout(); // This triggers the backend cleanup + Firebase sign out
            navigate("/signin");
        } catch (error) {
            console.error("Failed to log out", error);
        }
    };

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-body sticky-top shadow-sm">
            <div className="container">
                <a className="navbar-brand fw-bold" href={user ? "/dashboard" : "/home.html"}>
                    <img src="/assets/images/logo_pap.png" height="32" className="me-2" alt="Paws & Pixels" />
                    Paws & Pixels
                </a>

                {/* display home, about and contact only when user is NOT logged in */}
                {!user && (
                    <>
                        <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#nav">
                            <span className="navbar-toggler-icon"></span>
                        </button>
                        <div id="nav" className="collapse navbar-collapse">
                            <ul className="navbar-nav ms-auto mb-2 mb-lg-0">
                                <li className="nav-item"><a className="nav-link" href="/home.html">Home</a></li>
                                <li className="nav-item"><a className="nav-link" href="/about.html">About</a></li>
                                <li className="nav-item"><a className="nav-link" href="/contact.html">Contact Us</a></li>
                                <li className="nav-item"><a className="btn btn-primary ms-lg-2" href="/signin">Sign in</a></li>
                            </ul>
                        </div>
                    </>
                )}

                {user && (
                    <div className="ms-auto">
                        <div className="dropdown">
                            <button className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                <i
                                    className="bi bi-person-circle"
                                    style={{ fontSize: "1.5rem", color: "gray" }}
                                ></i>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li><center className="dropdown-item-text text-muted small">{user.displayName || user.email}</center></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><a className="dropdown-item" href="/dashboard">Studio</a></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    {/* 3. Update the button to use handleLogout */}
                                    <button
                                        className="dropdown-item text-danger"
                                        onClick={handleLogout}
                                    >
                                        Log out
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