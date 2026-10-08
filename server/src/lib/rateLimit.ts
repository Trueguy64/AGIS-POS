import type { RequestHandler } from "express";

/** Fixed-window per-IP limiter. ponytail: in-memory, resets on restart; fine for one Render instance. */
export function rateLimit({ windowMs, max }: { windowMs: number; max: number }): RequestHandler {
  const hits = new Map<string, { n: number; until: number }>();
  return (req, res, next) => {
    const key = req.ip ?? "unknown", t = Date.now();
    const h = hits.get(key);
    if (!h || t > h.until) hits.set(key, { n: 1, until: t + windowMs });
    else if (++h.n > max) { res.status(429).json({ message: "Too many requests, please wait a few minutes" }); return; }
    next();
  };
}
