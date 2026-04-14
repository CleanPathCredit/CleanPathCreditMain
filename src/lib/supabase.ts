/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Supabase client wired to use Clerk JWTs.
 *
 * Clerk JWT template setup (one-time, in Clerk dashboard):
 *   1. Clerk Dashboard → Configure → JWT Templates → New template → Supabase
 *   2. The template automatically sets:  { "sub": "{{user.id}}", "role": "authenticated" }
 *   3. Copy the "Signing key" and add it to Supabase:
 *      Supabase Dashboard → Auth → JWT Settings → JWT Secret → paste Clerk signing key
 *
 * Usage:
 *   const supabase = useSupabaseClient();   // inside a React component
 */

import { createClient } from "@supabase/supabase-js";
import { useSession } from "@clerk/clerk-react";
import { useMemo } from "react";
import type { Database } from "@/types/database";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. " +
    "Copy .env.example → .env.local and fill in your Supabase project credentials."
  );
}

const AUTH_OPTS = {
  persistSession: false,
  autoRefreshToken: false,
  detectSessionInUrl: false,
} as const;

/**
 * React hook that returns a Supabase client automatically refreshed with
 * the current Clerk session token. Return type is intentionally inferred so
 * it carries the full supabase-js generic (incl. PostgrestVersion) and all
 * table/insert types resolve correctly.
 */
export function useSupabaseClient() {
  const { session } = useSession();

  return useMemo(() => {
    // While Clerk is loading there's no session yet — return an unauthenticated
    // client so callers don't have to null-check. RLS will block all writes.
    if (!session) {
      return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: AUTH_OPTS,
      });
    }

    // Use the accessToken factory so tokens refresh automatically on expiry.
    return createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      accessToken: async () => {
        const token = await session.getToken({ template: "supabase" });
        return token ?? "";
      },
      auth: AUTH_OPTS,
    });
  }, [session?.id]);
}
