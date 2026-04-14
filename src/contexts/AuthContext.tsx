import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import type { UserData } from "@/types/user";

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  isAdmin: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userData: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
});

// Only log errors in development. In production we swallow them silently to
// avoid leaking Firestore paths / user identifiers via the browser console.
const devError = (...args: unknown[]) => {
  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.error(...args);
  }
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsubscribeDoc: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (!userData) {
          setLoading(true);
        }

        unsubscribeDoc = onSnapshot(
          doc(db, "users", currentUser.uid),
          (userDoc) => {
            if (userDoc.exists()) {
              const data = userDoc.data() as UserData;
              setUserData(data);
              // Admin is true only when the Firebase Auth custom claim AND
              // the Firestore role agree. Client-side this is advisory — the
              // Firestore rules enforce the real check server-side.
              setIsAdmin(data.role === "admin");
            } else {
              setUserData({ email: currentUser.email ?? "", role: "client" });
              setIsAdmin(false);
            }
            setLoading(false);
          },
          (error) => {
            devError("Error fetching user data:", error);
            setLoading(false);
          },
        );
      } else {
        setUserData(null);
        setIsAdmin(false);
        setLoading(false);
        if (unsubscribeDoc) unsubscribeDoc();
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const logout = async () => {
    await signOut(auth);
    // Clear local state immediately so no stale user data lingers in memory
    // between the signOut call and the onAuthStateChanged callback.
    setUser(null);
    setUserData(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, userData, loading, isAdmin, logout }}>
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent"></div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
