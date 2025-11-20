
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./auth/firebase";
import { useAuth } from "./auth/AuthContext";

export function NavBar() {
    const { user } = useAuth();
    const navigate = useNavigate();

    return (
        <nav className="navbar navbar-expand-lg navbar-light bg-body sticky-top shadow-sm">
            <div className="container">
                {/* Logo links to /home.html before login, to /connect after login */}
                <a className="navbar-brand fw-bold" href={user ? "/connect" : "/home.html"}>
                    <img src="/assets/images/logo_pap.png" height="32" className="me-2" alt="Paws & Pixels" />
                    Paws & Pixels
                </a>

                {/* BEFORE SIGN-IN: show links to static HTML pages */}
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

                {/* AFTER SIGN-IN: hide static links, show profile menu only */}
                {user && (
                    <div className="ms-auto">
                        <div className="dropdown">
                            <button className="btn btn-outline-secondary dropdown-toggle" data-bs-toggle="dropdown">
                                {/* <img
                                    src={user.photoURL || "/assets/images/avatar_placeholder.png"}
                                    width="24" height="24" className="rounded-circle me-2" alt=""
                                /> */}
                                <i
                                    className="bi bi-person-circle"
                                    style={{ fontSize: "1.5rem", color: "gray" }}
                                ></i>
                            </button>
                            <ul className="dropdown-menu dropdown-menu-end">
                                <li><center>{user.displayName || user.email}</center></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li><a className="dropdown-item" href="/dashboard">Studio</a></li>
                                <li><hr className="dropdown-divider" /></li>
                                <li>
                                    <button
                                        className="dropdown-item text-danger"
                                        onClick={() => signOut(auth).then(() => navigate("/signin"))}
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
