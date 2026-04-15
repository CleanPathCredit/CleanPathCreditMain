/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AuthContext — thin wrapper around Clerk + Supabase profile data.
 *
 * Clerk owns the auth session (sign-in, sign-up, tokens).
 * This context adds the Supabase `profiles` row so every component
 * can access `profile.role`, `profile.status`, etc. without re-fetching.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useUser, useSession, useClerk } from "@clerk/clerk-react";
import { useSupabaseClient } from "@/lib/supabase";
import type { Profile } from "@/types/database";

interface AuthContextType {
  /** The raw Clerk User object — null while loading or signed out */
  clerkUser: ReturnType<typeof useUser>["user"];
  /** Supabase profile row — null until fetched or if user has no profile yet */
  profile: Profile | null;
  /** True while Clerk session or profile is still loading */
  loading: boolean;
  /** Convenience: true when the profile row says role === 'admin' */
  isAdmin: boolean;
  /** Sign the user out via Clerk and clear local state */
  logout: () => Promise<void>;
  /** Re-fetch the profile row (call after updating profile data) */
  refreshProfile: () => Promise<void>;
  /** Shared Supabase client — use this instead of calling useSupabaseClient() directly
   *  to avoid spawning multiple GoTrueClient instances in the same browser context. */
  supabase: ReturnType<typeof useSupabaseClient>;
}

const AuthContext = createContext<AuthContextType>({
  clerkUser: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
  refreshProfile: async () => {},
  // Default is intentionally incomplete — AuthProvider is always in the tree.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: null as any,
});

const devError = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.error(...args);
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user: clerkUser, isLoaded: userLoaded } = useUser();
  const { session, isLoaded: sessionLoaded } = useSession();
  const { signOut } = useClerk();
  const supabase = useSupabaseClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!clerkUser || !session) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      // Use the server-side /api/me endpoint (service-role key, no RLS JWT needed)
      const token = await session.getToken();
      if (!token) {
        setProfile(null);
        return;
      }
      const res = await fetch("/api/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = (await res.json()) as Profile | null;
        setProfile(data);
      } else {
        setProfile(null);
      }
    } catch (err) {
      devError("Unexpected error fetching profile:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [clerkUser?.id, session?.id]);

  useEffect(() => {
    if (!userLoaded || !sessionLoaded) return;
    fetchProfile();
  }, [userLoaded, sessionLoaded, fetchProfile]);

  const logout = async () => {
    await signOut();
    setProfile(null);
  };

  const loading = !userLoaded || !sessionLoaded || profileLoading;
  const isAdmin = profile?.role === "admin";

  return (
    <AuthContext.Provider
      value={{
        clerkUser,
        profile,
        loading,
        isAdmin,
        logout,
        refreshProfile: fetchProfile,
        supabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
