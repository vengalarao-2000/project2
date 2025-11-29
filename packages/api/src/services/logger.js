//Initializes the logger and export it for use in other files
import { Logging } from "@google-cloud/logging";
import env from "../config/env.js";

// Initialize with your specific project ID
const logging = new Logging({ projectId: env.GCP_PROJECT_ID });

// Create a log stream. This name ("paws-pixels-backend") will appear in the Cloud Console.
const log = logging.log("paws-pixels-backend");

/**
 * Logs a structured entry to Google Cloud Logging.
 * @param {string} message - The main log message.
 * @param {string} severity - 'INFO', 'WARNING', 'ERROR', etc.
 * @param {object} metadata - Additional JSON data (e.g., userId, requestId).
 */
async function logToCloud(message, severity = "INFO", metadata = {}) {
    // Construct the metadata object required by Google Cloud
    const entryMetadata = {
        resource: { type: "global" },
        severity: severity,
    };

    // Create the entry
    const entry = log.entry(entryMetadata, {
        message: message,
        ...metadata, // Spread your custom data here
        timestamp: new Date().toISOString()
    });

    try {
        // Write to Cloud Logging
        await log.write(entry);
        console.log(`[Cloud Log Sent] ${message}`); // Local echo
    } catch (e) {
        console.error("Failed to write to Cloud Logging", e);
    }
}

export { logToCloud };
