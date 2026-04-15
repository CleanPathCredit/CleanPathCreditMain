/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * GET  /api/admin/clients   → all client profiles (admin only)
 * PATCH /api/admin/clients  → update a client's status + progress (admin only)
 *
 * Uses the service-role Supabase key to bypass RLS entirely.
 * Authentication: verifies the caller's Clerk JWT via JWKS, then confirms role = 'admin'.
 */

import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/types/database";

export const config = { runtime: "edge" };

const JWKS_URL = "https://clerk.cleanpathcredit.com/.well-known/jwks.json";
const JSON_H   = { "Content-Type": "application/json" };

// ── JWKS verification (same as api/me.ts) ──────────────────────────────────

interface JWK { kid: string; kty: string; alg: string; n?: string; e?: string; crv?: string; x?: string; y?: string; }

let cachedJwks: JWK[] | null = null;
let jwksCachedAt = 0;

async function getJwks(): Promise<JWK[]> {
  const now = Date.now();
  if (cachedJwks && now - jwksCachedAt < 3_600_000) return cachedJwks;
  const res  = await fetch(JWKS_URL);
  const data = (await res.json()) as { keys: JWK[] };
  cachedJwks   = data.keys;
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
    if (payload.exp && payload.exp < Date.now() / 1000) return null;
    const keys = await getJwks();
    const jwk  = keys.find((k) => k.kid === header.kid) as JsonWebKey | undefined;
    if (!jwk) return null;
    const sigInput = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
    const sig      = b64url(parts[2]);
    let valid = false;
    if (header.alg === "RS256") {
      const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
      valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, sig, sigInput);
    } else if (header.alg === "ES256") {
      const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["verify"]);
      valid = await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sig, sigInput);
    }
    return valid ? (payload.sub as string ?? null) : null;
  } catch {
    return null;
  }
}

// ── Handler ────────────────────────────────────────────────────────────────

export default async function handler(req: Request): Promise<Response> {
  // Verify caller
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: JSON_H });
  }
  const userId = await verifyJWT(auth.slice(7));
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: JSON_H });
  }

  const supabase = createClient<Database>(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  // Confirm admin role
  const { data: caller } = await supabase.from("profiles").select("role").eq("id", userId).single();
  if (caller?.role !== "admin") {
    return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: JSON_H });
  }

  // GET — list all clients
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("role", "client")
      .order("created_at", { ascending: false });

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: JSON_H });
    return new Response(JSON.stringify(data ?? []), { headers: JSON_H });
  }

  // PATCH — update client status + progress
  if (req.method === "PATCH") {
    const body = (await req.json()) as { id: string; status: string; progress: number };
    const { error } = await supabase
      .from("profiles")
      .update({ status: body.status as Database["public"]["Tables"]["profiles"]["Row"]["status"], progress: body.progress })
      .eq("id", body.id);

    if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: JSON_H });
    return new Response(JSON.stringify({ ok: true }), { headers: JSON_H });
  }

  return new Response("Method not allowed", { status: 405 });
}
