//match your backend URL
// dev: hit local api; prod: same origin as frontend (empty prefix)
const API_BASE = import.meta.env.DEV ? "http://localhost:3000" : "";

/**
 * Sends a log entry to the backend proxy for Google Cloud Logging
 * @param {string} message - The log message
 * @param {string} severity - 'INFO', 'WARNING', 'ERROR', 'CRITICAL'
 * @param {object} data - Additional metadata (optional)
 */
export const logToCloud = async (message, severity = "INFO", data = {}) => {
    try {
        // We use fetch with 'keepalive: true' to ensure logs are sent 
        // even if the user is navigating away or closing the tab.
        await fetch(`${API_BASE}/api/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                message,
                severity,
                data: {
                    ...data,
                    url: window.location.href, // Useful context: which page
                    userAgent: navigator.userAgent // Useful context: which browser
                }
            }),
            keepalive: true
        });
    } catch (error) {
        // Fallback: Log to console if the network fails so we don't lose it locally
        console.error("Failed to send log to cloud:", error);
    }
};