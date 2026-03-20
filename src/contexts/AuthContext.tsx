import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  userData: any | null;
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let unsubscribeDoc: () => void;

    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (!userData) {
          setLoading(true);
        }
        
        unsubscribeDoc = onSnapshot(doc(db, "users", currentUser.uid), (userDoc) => {
          if (userDoc.exists()) {
            const data = userDoc.data();
            setUserData(data);
            setIsAdmin(data.role === "admin");
          } else {
            setUserData({ role: "client" });
            setIsAdmin(false);
          }
          setLoading(false);
        }, (error) => {
          console.error("Error fetching user data:", error);
          setLoading(false);
        });
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
  }, []);

  const logout = async () => {
    await signOut(auth);
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
