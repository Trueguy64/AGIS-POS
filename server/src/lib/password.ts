import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";

const kdf = (pw: string, salt: string) => new Promise<Buffer>((ok, no) => scrypt(pw, salt, 64, (e, k) => (e ? no(e) : ok(k))));

/** scrypt, stored as "salt:hash" (hex). */
export async function hashPassword(pw: string) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await kdf(pw, salt)).toString("hex")}`;
}

export async function verifyPassword(pw: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex"), b = await kdf(pw, salt);
  return a.length === b.length && timingSafeEqual(a, b);
}
