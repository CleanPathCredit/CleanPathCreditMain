/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET /api/me
 *
 * Returns the caller's Supabase profile using the service-role key,
 * bypassing RLS entirely. Authenticates the caller by verifying their
 * standard Clerk JWT (RS256/ES256) against Clerk's JWKS endpoint.
 *
 * This avoids the Clerk→Supabase JWT template mismatch problem.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/types/database";

export const config = { runtime: "edge" };

const JWKS_URL = "https://clerk.cleanpathcredit.com/.well-known/jwks.json";

interface JWK {
  kid: string;
  kty: string;
  alg: string;
  n?: string;
  e?: string;
  crv?: string;
  x?: string;
  y?: string;
}

let cachedJwks: JWK[] | null = null;
let jwksCachedAt = 0;

async function getJwks(): Promise<JWK[]> {
  const now = Date.now();
  if (cachedJwks && now - jwksCachedAt < 3_600_000) return cachedJwks;
  const res = await fetch(JWKS_URL);
  const data = (await res.json()) as { keys: JWK[] };
  cachedJwks = data.keys;
  jwksCachedAt = now;
  return data.keys;
}

function b64url(s: string): ArrayBuffer {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0)).buffer;
}

async function verifyJWT(token: string): Promise<string | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const header  = JSON.parse(new TextDecoder().decode(b64url(parts[0])));
    const payload = JSON.parse(new TextDecoder().decode(b64url(parts[1])));

    // Reject expired tokens
    if (payload.exp && payload.exp < Date.now() / 1000) return null;

    // Find the matching JWK
    const keys = await getJwks();
    const jwk  = keys.find((k) => k.kid === header.kid) as JsonWebKey | undefined;
    if (!jwk) return null;

    const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const sig      = b64url(parts[2]);
    let   valid    = false;

    if (header.alg === "RS256") {
      const key = await crypto.subtle.importKey(
        "jwk", jwk,
        { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
        false, ["verify"],
      );
      valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, sigInput);
    } else if (header.alg === "ES256") {
      const key = await crypto.subtle.importKey(
        "jwk", jwk,
        { name: "ECDSA", namedCurve: "P-256" },
        false, ["verify"],
      );
      valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, sigInput);
    }

    return valid ? (payload.sub as string ?? null) : null;
  } catch {
    return null;
  }
}

export default async function handler(req: Request): Promise<Response> {
  const headers = { "Content-Type": "application/json" };

  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify(null), { status: 401, headers });
  }

  const userId = await verifyJWT(auth.slice(7));
  if (!userId) {
    return new Response(JSON.stringify(null), { status: 401, headers });
  }

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  return new Response(JSON.stringify(data ?? null), { headers });
}
