// Observed behaviour (Task 1 probe, 2026-10-08): two concurrent interactive transactions
// on a single better-sqlite3 connection SERIALISE via the SQLite write-lock; the second
// transaction waits for the first to commit. No busy error reached withSqliteRetry.
// Duration of two parallel 20 ms-setTimeout transactions was ~237 ms (vs ~20 ms parallel,
// ~40 ms serialised) — the adapter blocks on the lock during the wait, so the cost is
// real wall-clock, not a retry storm.
// busy-timeout mechanism in db.ts: better-sqlite3 `timeout: 5000` via the Prisma adapter.
const BUSY = /SQLITE_BUSY|database is locked|P2034|Transaction already closed|timed out/i;

/** Retry a write that lost a SQLite lock race. After 3 tries, rethrow with status 409 so routes answer "try again". */
export async function withSqliteRetry<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; ; i++) {
    try { return await fn(); }
    catch (e) {
      const msg = `${(e as { code?: string }).code ?? ""} ${(e as Error).message ?? ""}`;
      if (!BUSY.test(msg)) throw e;
      if (i === 2) throw Object.assign(new Error("Busy, please try again"), { status: 409 });
      await new Promise((r) => setTimeout(r, 25 * (i + 1)));
    }
  }
}
