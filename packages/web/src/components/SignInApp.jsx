import React, { useState } from "react";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from "firebase/auth";
import { setDoc, doc, serverTimestamp } from "firebase/firestore";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ReactGA from 'react-ga4';
import { logToCloud } from "../utils/logger";

// initialized firebase exports
import { auth, db } from "./auth/firebase";

export default function SignInApp() {
    const [mode, setMode] = useState("signin");
    const [loading, setLoading] = useState(false);

    const [signIn, setSignIn] = useState({ email: "", password: "" });
    const [signUp, setSignUp] = useState({ username: "", email: "", password: "", confirmPassword: "" });

    const onSignIn = async (e) => {
        e.preventDefault();
        setLoading(true);
        logToCloud("User attempting login", "INFO", { email: signIn.email });
        try {
            // authenticate user against firebase auth service
            await signInWithEmailAndPassword(auth, signIn.email, signIn.password);
            // Track the event: User signed in
            ReactGA.event({
                category: "User Engagement",
                action: "Login",
                label: "Method: Password"
            });

            logToCloud("User logged in successfully", "INFO", {
                method: "password",
                email: signIn.email
            });

            toast.success("Signed in!");

            // force full page redirect to ensure clean state reset for the connect page
            window.location.href = "/connect";
        } catch (err) {
            ReactGA.event({
                category: "Error",
                action: "Login Failed",
                label: err.code || err.message
            });

            logToCloud("Login failed", "ERROR", {
                error_code: err.code,
                error_message: err.message
            });
            toast.error(err.message || "Sign-in failed");
        } finally {
            setLoading(false);
        }
    };

    const onSignUp = async (e) => {
        e.preventDefault();

        // client-side validation before making network request
        if (signUp.password !== signUp.confirmPassword) {
            logToCloud("Sign up validation failed", "WARNING", { reason: "passwords_mismatch" });
            toast.error("Passwords do not match");
            return;
        }

        setLoading(true);
        logToCloud("User attempting sign up", "INFO");

        try {
            // create new authentication record in firebase
            const { user } = await createUserWithEmailAndPassword(auth, signUp.email, signUp.password);

            // update auth profile immediately so displayname is available on first login
            await updateProfile(user, { displayName: signUp.username });

            // create a public user document in firestore
            // using uid as document key links auth to database data
            await setDoc(doc(db, "users", user.uid), {
                uid: user.uid,
                username: signUp.username,
                email: signUp.email,
                createdAt: serverTimestamp(), // server-side timestamp for accuracy
                provider: "password",
            });

            toast.success("Account created!");
            // Track the event: New user signed up
            ReactGA.event({
                category: "User Engagement",
                action: "Sign Up",
                label: "New User Created"
            });

            logToCloud("New user registered successfully", "INFO", {
                uid: user.uid,
                username: signUp.username
            });

            // prefill sign-in fields and switch view to improve ux
            setSignIn({ email: signUp.email, password: signUp.password });
            setMode("signin");
        } catch (err) {
            ReactGA.event({
                category: "Error",
                action: "Sign Up Failed",
                label: err.code || err.message
            });

            logToCloud("Sign up failed", "ERROR", {
                error_code: err.code,
                error_message: err.message
            });
            toast.error(err.message || "Sign-up failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container py-5">
            <div className="row g-4">
                {/* Sign In Form */}
                <div className="col-12 col-md-6">
                    <h1 className="mb-4">Sign in</h1>
                    <form onSubmit={onSignIn} className="my-custom-card card p-4 shadow">
                        <div className="mb-3">
                            <label className="form-label">Email</label>
                            <input
                                className="form-control"
                                type="email"
                                value={signIn.email}
                                onChange={(e) => setSignIn((s) => ({ ...s, email: e.target.value }))}
                                autoComplete="username"
                                required
                            />
                        </div>
                        <div className="mb-3">
                            <label className="form-label">Password</label>
                            <input
                                className="form-control"
                                type="password"
                                value={signIn.password}
                                onChange={(e) => setSignIn((s) => ({ ...s, password: e.target.value }))}
                                autoComplete="current-password"
                                required
                            />
                        </div>
                        <div className="d-flex gap-2">
                            <button className="btn btn-primary" type="submit" disabled={loading}>
                                {loading && mode === "signin" ? "Submitting…" : "Submit"}
                            </button>
                            <button
                                className="btn btn-outline-secondary"
                                type="button"
                                onClick={() => setMode("signup")}
                            >
                                Create account
                            </button>
                        </div>
                    </form>
                </div>

                {/* Sign Up Form (Conditional Render) */}
                {mode === "signup" && (
                    <div className="col-12 col-md-6">
                        <h2 className="mb-4">Create account</h2>
                        <form onSubmit={onSignUp} className="my-custom-card card p-4 shadow-sm">
                            <div className="mb-3">
                                <label className="form-label">Username</label>
                                <input
                                    className="form-control"
                                    value={signUp.username}
                                    onChange={(e) => setSignUp((p) => ({ ...p, username: e.target.value }))}
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Email</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    value={signUp.email}
                                    onChange={(e) => setSignUp((p) => ({ ...p, email: e.target.value }))}
                                    autoComplete="email"
                                    required
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={signUp.password}
                                    onChange={(e) => setSignUp((p) => ({ ...p, password: e.target.value }))}
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="mb-3">
                                <label className="form-label">Confirm password</label>
                                <input
                                    type="password"
                                    className="form-control"
                                    value={signUp.confirmPassword}
                                    onChange={(e) => setSignUp((p) => ({ ...p, confirmPassword: e.target.value }))}
                                    autoComplete="new-password"
                                    required
                                    minLength={6}
                                />
                            </div>
                            <div className="d-flex gap-2">
                                <button className="btn btn-success" type="submit" disabled={loading}>
                                    {loading && mode === "signup" ? "Creating…" : "Create account"}
                                </button>
                                <button className="btn btn-outline-secondary" type="button" onClick={() => setMode("signin")}>
                                    Back to Sign in
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>

            <ToastContainer position="top-center" />
        </div>
    );
}