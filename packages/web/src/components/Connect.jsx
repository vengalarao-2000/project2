
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Upload, Lock, Loader2 } from "lucide-react";
import { useAuth } from "./auth/AuthContext";
import "../styles/connect.min.css";

const API_BASE = "http://localhost:3000";

// helper to convert file object to base64 string for upload
const toBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => resolve(reader.result);
  reader.onerror = error => reject(error);
});

const Connect = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // reference to hidden file input to trigger click programmatically
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  // 1. Handle Google Photos Click
  const handleGoogleOAuth = () => {
    // redirect to backend auth route to initiate oauth flow
    window.location.href = `${API_BASE}/auth/google`;
  };

  // 2. Handle "Upload Files" Click (Triggers Hidden Input)
  const handleUploadClick = () => {
    if (fileInputRef.current) {
      // reset input value to allow selecting the same file again if needed
      fileInputRef.current.value = '';
      // manually trigger the native file picker
      fileInputRef.current.click();
    }
  };

  // 3. Process Selected Files
  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    setUploading(true);

    try {
      // process all selected files in parallel to convert them to base64
      const items = await Promise.all(files.map(async file => ({
        source: 'local',
        filename: file.name,
        mimeType: file.type,
        base64: await toBase64(file)
      })));

      // send raw file data to backend to be uploaded to cloud storage
      const idToken = await user.getIdToken();
      const res = await fetch(`${API_BASE}/api/session/draft`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${idToken}`
        },
        body: JSON.stringify({ items, source: 'local' })
      });

      if (!res.ok) throw new Error("Upload failed");

      // redirect user to dashboard once backend processing is initialized
      navigate('/dashboard');

    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload photos. Please try again.");
      setUploading(false);
    }
  };

  // Define sources array inside component to access handlers
  const sources = [
    {
      id: "google",
      title: "Google Photos",
      subtitle: "Access your photo library",
      brandClass: "brand brand-google",
      onClick: handleGoogleOAuth,
    },
    {
      id: "upload",
      title: "Upload Files",
      subtitle: "Select photos from your device",
      brandClass: "brand brand-upload",
      icon: <Upload size={20} />,
      onClick: handleUploadClick,
    },
  ];

  return (
    <div className="cp-page">
      {/* hidden input element that handles the actual file selection */}
      <input
        type="file"
        ref={fileInputRef}
        multiple
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <main className="cp-main">
        <section className="cp-hero">
          <h1 className="cp-title">Connect Your Photos</h1>
          <p className="cp-subtitle">Choose where to find your pet photos</p>
        </section>

        <section className="cp-cards">
          {uploading ? (
            /* Loading State */
            <div className="text-center py-5 w-100">
              <Loader2 className="animate-spin text-primary mb-3" size={48} />
              <h3 className="h5">Uploading your photos...</h3>
              <p className="text-muted">Please wait while we prepare your dashboard.</p>
            </div>
          ) : (
            /* Source Cards */
            sources.map((s, idx) => (
              <motion.button
                key={s.id}
                type="button"
                className="cp-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx, duration: 0.25 }}
                whileHover={{ y: -2, boxShadow: "0 8px 24px rgba(0,0,0,0.08)" }}
                whileTap={{ scale: 0.98 }}
                onClick={s.onClick}
                disabled={uploading}
              >
                <div className={s.brandClass}>
                  {s.icon ? (
                    s.icon
                  ) : (
                    <span className="brand-letter">
                      {s.id === "google" ? "G" : "P"}
                    </span>
                  )}
                </div>

                <div className="cp-card-text">
                  <div className="cp-card-title">{s.title}</div>
                  <div className="cp-card-subtitle">{s.subtitle}</div>
                </div>

                <ArrowRight className="cp-card-arrow" size={18} />
              </motion.button>
            ))
          )}
        </section>

        {!uploading && (
          <div className="cp-note">
            <Lock size={14} />
            <span>
              Your photos are processed securely and kept private.
            </span>
          </div>
        )}

        {/* Stepper */}
        <nav className="cp-stepper">
          <div className="cp-step cp-step-active">1. Connect</div>
          <div className="cp-step">2. Syncing</div>
          <div className="cp-step">3. Dashboard</div>
        </nav>
      </main>
    </div>
  );
};

export default Connect;