import { execSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import jwt from "jsonwebtoken";
import type { AddressInfo } from "node:net";

process.env.JWT_SECRET ??= "test-secret";

/** One migrated SQLite file per test file. Sets DATABASE_URL before anything imports src/db. */
export async function freshDb() {
  const url = "file:" + join(mkdtempSync(join(tmpdir(), "agis-")), "test.db");
  process.env.DATABASE_URL = url;
  execSync("npx prisma migrate deploy", { cwd: join(import.meta.dirname, ".."), env: { ...process.env, DATABASE_URL: url }, stdio: "ignore" });
  const { prisma } = await import("../src/db");
  return { prisma, url };
}

export function fakeClock(start = "2026-11-01T10:00:00.000Z") {
  let t = new Date(start).getTime();
  return { now: () => new Date(t), advance: (ms: number) => { t += ms; }, set: (iso: string) => { t = new Date(iso).getTime(); } };
}

export function authCookie(user: { id?: number; email?: string; role?: "Manager" | "Employee" } = {}) {
  const token = jwt.sign({ id: user.id ?? 1, email: user.email ?? "staff@test", role: user.role ?? "Manager" }, process.env.JWT_SECRET!);
  return `token=${token}`;
}

export async function startApp() {
  const { createApp } = await import("../src/app");
  const server = createApp().listen(0);
  await new Promise((r) => server.once("listening", r));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { base, close: () => new Promise<void>((r) => server.close(() => r())) };
}
