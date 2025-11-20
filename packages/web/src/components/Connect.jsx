import React from "react";
import { motion } from "framer-motion";
//provides icons
import { ArrowRight, Upload, Image, Lock } from "lucide-react";
import "../styles/connect.min.css";

const handleGoogleOAuth = () => {
  window.location.href = "http://localhost:3000/auth/google";
};

const handleUpload = () => {
  // Trigger file picker or route to upload page
  console.log("Initiate file upload");
};
const sources = [
  {
    id: "google",
    title: "Google Photos",
    subtitle: "Access your photo library",
    brandClass: "brand brand-google",
    onClick: handleGoogleOAuth, // This starts OAuth
  },
  {
    id: "upload",
    title: "Upload Files",
    subtitle: "Select photos from your device",
    brandClass: "brand brand-upload",
    icon: <Upload size={20} />,
    onClick: handleUpload, // This starts direct upload
  },
];

const Connect = () => {
  return (
    <div className="cp-page">
      {/* Main */}
      <main className="cp-main">
        <section className="cp-hero">
          <h1 className="cp-title">Connect Your Photos</h1>
          <p className="cp-subtitle">Choose where to find your pet photos</p>
        </section>

        <section className="cp-cards">
          {sources.map((s, idx) => (
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
            >
              <div className={s.brandClass}>
                {/* If a lucide icon is provided (Upload), render it; otherwise show a letter badge */}
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
          ))}
        </section>

        <div className="cp-note">
          <Lock size={14} />
          <span>
            Your photos are processed securely and never stored permanently
          </span>
        </div>

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
