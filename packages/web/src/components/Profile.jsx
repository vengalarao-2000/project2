import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { updateProfile } from "firebase/auth";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
    Camera, Mail, Calendar as CalendarIcon,
    User, LogOut, Loader2, ArrowLeft
} from "lucide-react";
import { Toast } from "./Toast";
import { useAuth } from "./auth/AuthContext";
import { auth, storage } from "./auth/firebase";
import { NavBar } from "./NavBar";
import "../styles/profile.min.css";

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const [uploading, setUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState(user?.photoURL || null);

    //state for Toast message
    const [toastMsg, setToastMsg] = useState({ message: null, type: "success" });

    // Format "Joined" date from Firebase metadata
    const joinDate = user?.metadata?.creationTime
        ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
        : "N/A";

    // display toast notification and auto-dismiss after 3 seconds
    const showToast = (msg, type = "success") => {
        setToastMsg({ message: msg, type: type });
        setTimeout(() => setToastMsg({ message: null, type: "success" }), 3000);
    }
    // handle profile picture upload with storage and auth profile update
    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // 1. show local preview immediately for better ux
        const localUrl = URL.createObjectURL(file);
        setPreviewUrl(localUrl);
        setUploading(true);

        try {
            // 2. upload file to firebase storage under profile_images/{uid}/profile.jpg
            const storageRef = ref(storage, `profile_images/${user.uid}/profile.jpg`);
            await uploadBytes(storageRef, file);

            // 3. retrieve public download url from storage
            const downloadURL = await getDownloadURL(storageRef);

            // 4. update firebase auth user profile with new photo url
            await updateProfile(auth.currentUser, {
                photoURL: downloadURL
            });
            showToast("Profile picture updated successfully!", "success");
            // 5. authcontext listener will automatically catch the profile change
            console.log("Profile picture updated!");
        } catch (error) {
            console.error("Error uploading image:", error);
            showToast("Failed to update profile picture.", "error");
            // revert preview to previous profile picture on upload failure
            setPreviewUrl(user?.photoURL);
        } finally {
            setUploading(false);
        }
    };

    // handle logout and redirect to sign in page
    const handleLogout = async () => {
        try {
            await logout();
            navigate("/signin");
        } catch (e) {
            console.error("Logout failed", e);
        }
    };

    if (!user) return <div className="pf-loading"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="pf-page">
            <Toast
                message={toastMsg.message}
                type={toastMsg.type}
                onClose={() => setToastMsg({ ...toastMsg, message: null })}
            />
            <main className="pf-main">
                {/* Hero / Title */}
                <section className="pf-hero">
                    <button onClick={() => navigate('/dashboard')} className="btn btn-link text-decoration-none mb-2 ps-0 text-muted">
                        <ArrowLeft size={16} className="me-1" /> Back to Dashboard
                    </button>
                    <h1 className="pf-title">Your Profile</h1>
                    <p className="pf-subtitle">Manage your account details and preferences</p>
                </section>

                {/* Profile Card */}
                <motion.section
                    className="pf-card pf-profile-card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <div className="pf-profile-head">
                        {/* Avatar Upload Section */}
                        <div className="pf-avatar-wrapper">
                            <div className="pf-avatar-container">
                                <img
                                    className="pf-avatar"
                                    src={previewUrl || "https://api.dicebear.com/9.x/initials/svg?seed=" + (user.displayName || "User")}
                                    alt="Profile"
                                />
                                {uploading && (
                                    <div className="pf-avatar-overlay">
                                        <Loader2 size={20} className="animate-spin text-white" />
                                    </div>
                                )}
                            </div>

                            {/* Hidden File Input + Trigger Label */}
                            <label htmlFor="avatar-upload" className="pf-edit-avatar-btn">
                                <Camera size={16} />
                            </label>
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                disabled={uploading}
                                hidden
                            />
                        </div>

                        <div className="pf-id">
                            <div className="pf-name-row">
                                <h2 className="pf-name">{user.displayName || "Paws & Pixels User"}</h2>
                            </div>
                            {/* Use UID or a custom username if you store it in Firestore */}
                            {/* <div className="pf-username">@{user.uid.slice(0,8)}</div> */}

                            <div className="pf-meta">
                                <span className="pf-meta-item">
                                    <Mail size={14} /> {user.email}
                                </span>
                                <span className="pf-dot">•</span>
                                <span className="pf-meta-item">
                                    <CalendarIcon size={14} /> Joined {joinDate}
                                </span>
                            </div>
                        </div>
                    </div>
                </motion.section>

                {/* Account Settings List */}
                <motion.section
                    className="pf-card pf-settings"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05, duration: 0.25 }}
                >
                    <h3 className="pf-card-title">Account</h3>
                    <div className="pf-list">
                        <div className="pf-list-item">
                            <div className="pf-list-left">
                                <div className="pf-list-icon">
                                    <User size={18} />
                                </div>
                                <div>
                                    <div className="pf-list-title">Account Details</div>
                                    <div className="pf-list-sub">
                                        UID: <span className="user-select-all font-monospace">{user.uid}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="pf-list-item">
                            <div className="pf-list-left">
                                <div className="pf-list-icon">
                                    <Mail size={18} />
                                </div>
                                <div>
                                    <div className="pf-list-title">Email Verification</div>
                                    <div className="pf-list-sub">
                                        {user.emailVerified ? (
                                            <span className="text-success">Verified</span>
                                        ) : (
                                            <span className="text-warning">Not Verified</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <button className="pf-list-item pf-logout-item" onClick={handleLogout}>
                            <div className="pf-list-left">
                                <div className="pf-list-icon logout-icon">
                                    <LogOut size={18} />
                                </div>
                                <div>
                                    <div className="pf-list-title text-danger">Log Out</div>
                                    <div className="pf-list-sub">Sign out of this device</div>
                                </div>
                            </div>
                            <span className="pf-arrow">›</span>
                        </button>
                    </div>
                </motion.section>
            </main>
        </div>
    );
}