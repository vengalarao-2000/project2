import { createContext, useContext, useEffect, useState } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, setPersistence, browserLocalPersistence } from "firebase/auth";

const Ctx = createContext({ user: undefined });
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

    return <Ctx.Provider value={{ user }}>{children}</Ctx.Provider>;
}
