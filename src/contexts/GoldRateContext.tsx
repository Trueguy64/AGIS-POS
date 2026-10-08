/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { GoldRate } from "../types/types";
import { getGoldRate } from "../api/gold";
import { STALE_AFTER_MS } from "../lib/gold";

type Status = "loading" | "ok" | "unavailable";
type Ctx = { rate: GoldRate | null; status: Status; retry: () => void };

const GoldRateContext = createContext<Ctx>({ rate: null, status: "loading", retry: () => {} });

export function GoldRateProvider({ children }: { children: ReactNode }) {
  const [rate, setRate] = useState<GoldRate | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  const refresh = useCallback(() => {
    getGoldRate()
      .then((r) => {
        setRate({ ...r, stale: Date.now() - Date.parse(r.updatedAt) > STALE_AFTER_MS });
        setStatus("ok");
      })
      .catch((err) => {
        console.error("Gold rate fetch failed", err);
        // Keep the last rate and flag it; with no rate at all, say so and offer retry.
        setRate((prev) => (prev ? { ...prev, stale: true } : prev));
        setStatus((s) => (s === "ok" ? "ok" : "unavailable"));
      });
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 60_000);
    return () => clearInterval(id);
  }, [refresh]);

  // Retry is the only caller that flips "unavailable" back to "loading"; the effect starts there already.
  const retry = useCallback(() => { setStatus((s) => (s === "unavailable" ? "loading" : s)); refresh(); }, [refresh]);

  return <GoldRateContext.Provider value={{ rate, status, retry }}>{children}</GoldRateContext.Provider>;
}

/** Live gold rate, or null while loading / unavailable. */
export const useGoldRate = () => useContext(GoldRateContext).rate;
/** Loading / ok / unavailable plus a retry for the stamp's empty state. */
export const useGoldRateStatus = () => {
  const { status, retry } = useContext(GoldRateContext);
  return { status, retry };
};
