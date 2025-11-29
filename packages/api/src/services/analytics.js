import axios from "axios";
import env from "../config/env.js";

const GA_ENDPOINT = `https://www.google-analytics.com/mp/collect?measurement_id=${env.GA_MEASUREMENT_ID}&api_secret=${env.GA_API_SECRET}`;

/**
 * Sends a server-side event to Google Analytics 4
 * @param {string} clientId - Unique user ID (e.g. Firebase UID)
 * @param {string} eventName - Name of the event (e.g. "api_call_gemini")
 * @param {object} params - Custom parameters (e.g. { items: 5 })
 */

// Standardized Event Names
export const EVENTS = {
    ANALYZE_SUCCESS: "api_analyze_success",
    FINALIZE_SUCCESS: "api_finalize_success",
    REFINE_SUCCESS: "api_refine_success",
    FUSE_SUCCESS: "api_fuse_success",
    HISTORY_FETCH: "api_history_fetch",
    API_ERROR: "api_error",
    PICKER_SESSION_CREATED: "api_picker_session_created"
};

export async function trackServerEvent(clientId, eventName, params = {}) {
    try {
        // Payload structure required by GA4 Measurement Protocol
        const payload = {
            client_id: clientId || "server_user",
            events: [{
                name: eventName,
                params: params
            }]
        };

        await axios.post(GA_ENDPOINT, payload);
        console.log(`[Analytics] Sent event: ${eventName}`);
    } catch (error) {
        console.error("[Analytics] Failed to send event:", error.message);
    }
}