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
}

const AuthContext = createContext<AuthContextType>({
  clerkUser: null,
  profile: null,
  loading: true,
  isAdmin: false,
  logout: async () => {},
  refreshProfile: async () => {},
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
    if (!clerkUser) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", clerkUser.id)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = row not found — expected on first login before webhook fires
        devError("Error fetching profile:", error.message);
      }
      setProfile(data ?? null);
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
      }}
    >
      {loading ? (
        <div className="flex min-h-screen items-center justify-center bg-zinc-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-600 border-t-transparent" />
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
