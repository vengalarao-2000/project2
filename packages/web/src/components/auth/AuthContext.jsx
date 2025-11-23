import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
// 1. Import signOut
import { onAuthStateChanged, setPersistence, browserLocalPersistence, signOut } from "firebase/auth";

const API_BASE = "http://localhost:3000"; // Or process.env.VITE_API_URL

// 2. Update context definition to include logout
const Ctx = createContext({
    user: undefined,
    logout: async () => { }
});

export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(undefined); // undefined = loading, null = signed out

    useEffect(() => {
        let unsub = () => { };
        (async () => {
            await setPersistence(auth, browserLocalPersistence); // survive refresh/navigation
            unsub = onAuthStateChanged(auth, (u) => setUser(u)); // u=null when signed out
        })();
        return () => unsub();
    }, []);

    // 3. Define the Logout Logic
    const logout = async () => {
        try {
            // A. Call Backend to clean up 'session_items' (Unprocessed/In Progress)
            // We do this BEFORE signing out so we still have a valid token to send to the backend.
            if (user) {
                const token = await user.getIdToken();
                await fetch(`${API_BASE}/api/session/clear`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            }
        } catch (error) {
            console.error("Session cleanup failed:", error);
            // We continue to sign out even if cleanup fails to avoid trapping the user
        } finally {
            // B. Actual Firebase Sign Out
            await signOut(auth);
        }
    };

    // 4. Expose 'logout' in the value object
    return <Ctx.Provider value={{ user, logout }}>{children}</Ctx.Provider>;
}