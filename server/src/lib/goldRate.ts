export const GRAMS_PER_TROY_OUNCE = 31.1035;
const TTL_MS = 60_000;
const FRESH_TIMEOUT_MS = 10_000;

export type GoldRate = { usdPerOunce: number; usdToThb: number; thbPerGram: number; updatedAt: string };

let cache: { rate: GoldRate; at: number } | null = null;

async function fetchRate(): Promise<GoldRate> {
  const [xau, fx] = await Promise.all([
    fetch("https://forex-data-feed.swissquote.com/public-quotes/bboquotes/instrument/XAU/USD", { signal: AbortSignal.timeout(FRESH_TIMEOUT_MS) }).then((r) => r.json()),
    fetch("https://api.frankfurter.app/latest?from=USD&to=THB", { signal: AbortSignal.timeout(FRESH_TIMEOUT_MS) }).then((r) => r.json()), // ECB reference rate
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

/** Cached 60 s. On feed failure returns the last good rate; throws only when there has never been one. */
export async function getGoldRate(): Promise<GoldRate> {
  try {
    if (!cache || Date.now() - cache.at > TTL_MS) cache = { rate: await fetchRate(), at: Date.now() };
  } catch (err) {
    if (!cache) throw err;
    console.error("Gold rate fetch failed, serving cached:", err);
  }
  return cache.rate;
}

/** Like {@link getGoldRate} but throws if the cached rate is more than 10 minutes old. */
export async function getGoldRateFresh(): Promise<GoldRate> {
  const rate = await getGoldRate();
  if (!cache || Date.now() - cache.at > 10 * 60_000) throw new Error("Gold rate is stale");
  return rate;
}
