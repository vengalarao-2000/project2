import React, { useEffect, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { RefreshCcw, Camera } from "lucide-react";
import "../styles/syncing.min.css";

const Syncing = () => {
    const [progress, setProgress] = useState(62);
    const rotateCtrl = useAnimation();

    // Spin the sync icon gently
    useEffect(() => {
        rotateCtrl.start({
            rotate: 360,
            transition: { repeat: Infinity, ease: "linear", duration: 2.25 },
        });
    }, [rotateCtrl]);

    // Demo progress (optional). Remove this effect if you control progress externally.
    useEffect(() => {
        const id = setInterval(() => {
            setProgress((p) => (p < 78 ? p + 1 : p)); // creep up then stop
        }, 900);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="ap-page">
            <main className="ap-main">
                {/* Sync icon + title */}
                <motion.div
                    className="ap-hero"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25 }}
                >
                    <motion.div className="ap-sync-icon" animate={rotateCtrl}>
                        <RefreshCcw size={34} />
                    </motion.div>
                    <h1 className="ap-title">Analyzing Your Photos</h1>
                    <p className="ap-subtitle">
                        Finding pets and generating captions with AI…
                    </p>
                </motion.div>

                {/* Card with progress */}
                <motion.section
                    className="ap-card"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1, duration: 0.25 }}
                    aria-label="processing status"
                >
                    <div className="ap-card-row">
                        <div className="ap-badge">
                            <Camera size={18} />
                        </div>
                        <div className="ap-card-text">Processing photos…</div>
                    </div>

                    <div
                        className="ap-progress"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={progress}
                    >
                        <motion.div
                            className="ap-progress-bar"
                            initial={{ width: "0%" }}
                            animate={{ width: `${progress}%` }}
                            transition={{ ease: "easeOut", duration: 0.6 }}
                        />
                    </div>

                    <div className="ap-hint">This may take a moment</div>
                </motion.section>

                {/* CTA */}
                <motion.button
                    type="button"
                    className="ap-cta"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.25 }}
                    onClick={() => console.log("Continue to dashboard")}
                >
                    Continue to Dashboard
                </motion.button>

                {/* Stepper */}
                <nav className="ap-stepper">
                    <div className="ap-step">1. Connect</div>
                    <div className="ap-step ap-step-active">2. Syncing</div>
                    <div className="ap-step">3. Dashboard</div>
                </nav>
            </main>
        </div>
    );
};
export default Syncing;