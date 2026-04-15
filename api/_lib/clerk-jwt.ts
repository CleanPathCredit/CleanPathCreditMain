/**
 * @license SPDX-License-Identifier: Apache-2.0
 *
 * Shared helper for verifying Clerk JWTs in Edge functions.
 * Fetches Clerk's JWKS and verifies RS256 / ES256 signatures.
 * Returns the Clerk user_id (sub) on success, or null on any failure.
 */

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

/**
 * Verify a Clerk-issued JWT and return the user_id (`sub` claim) if valid.
 * Returns null for invalid / expired tokens.
 */
export async function verifyClerkJWT(token: string): Promise<string | null> {
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

/**
 * Extract + verify the bearer token from an incoming Request.
 * Returns the Clerk user_id or null.
 */
export async function getClerkUserIdFromRequest(req: Request): Promise<string | null> {
  const auth = req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return verifyClerkJWT(auth.slice(7));
}
