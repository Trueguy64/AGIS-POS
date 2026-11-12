import { createHmac, timingSafeEqual } from "node:crypto";
import type { JwtPayload } from "../types";

const sig = (body: string, secret: string) => createHmac("sha256", secret).update(body).digest("base64url");

/** Signed session token: base64url(JSON payload + exp seconds).HMAC-SHA256. */
export function signToken(payload: JwtPayload, secret: string, ttlSec: number) {
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSec })).toString("base64url");
  return `${body}.${sig(body, secret)}`;
}

export function verifyToken(token: string, secret: string): JwtPayload | null {
  const [body, s] = token.split(".");
  if (!body || !s) return null;
  const expect = sig(body, secret);
  if (s.length !== expect.length || !timingSafeEqual(Buffer.from(s), Buffer.from(expect))) return null;
  try {
    const p = JSON.parse(Buffer.from(body, "base64url").toString()) as JwtPayload & { exp: number };
    return p.exp > Date.now() / 1000 ? { id: p.id, email: p.email, role: p.role } : null;
  } catch { return null; }
}
