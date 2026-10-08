import { Router } from "express";

const GRAMS_PER_TROY_OUNCE = 31.1035;
const TTL_MS = 60_000;

export type GoldRate = { usdPerOunce: number; usdToThb: number; thbPerGram: number; updatedAt: string };

let cache: { rate: GoldRate; at: number } | null = null;

async function fetchRate(): Promise<GoldRate> {
  const [xau, fx] = await Promise.all([
    fetch("https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD").then((r) => r.json()),
    fetch("https://api.frankfurter.app/latest?from=USD&to=THB").then((r) => r.json()), // ECB reference rate
  ]);
  const usdPerOunce = Number(xau?.[1]?.spreadProfilePrices?.[1]?.ask);
  const usdToThb = Number(fx?.rates?.THB);
  if (!usdPerOunce || !usdToThb) throw new Error("Gold rate feed returned no price");
  return {
    usdPerOunce,
    usdToThb,
    thbPerGram: (usdPerOunce * usdToThb) / GRAMS_PER_TROY_OUNCE,
    updatedAt: new Date().toISOString(),
  };
}

const router = Router();

// Public: the rate is public market data and the login page needs nothing else.
router.get("/", async (_req, res) => {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) cache = { rate: await fetchRate(), at: Date.now() };
    res.json(cache.rate);
  } catch (err) {
    console.error("Gold rate fetch failed:", err);
    if (cache) {
      res.json(cache.rate); // ponytail: serve stale rate when the feed hiccups
      return;
    }
    res.status(502).json({ message: "Gold rate unavailable" });
  }
});

export default router;
