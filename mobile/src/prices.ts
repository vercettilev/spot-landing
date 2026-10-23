import { useCallback, useEffect, useState } from "react";
import { fetchPrices } from "./api";

/* Prices now, per coin, kept a minute: Home's Sniffed lately measures each
   coin against its price when it was sniffed, every time Home shows. */
const cache = new Map<string, { at: number; usd: number | null }>();
const FRESH_MS = 60_000;
/* Coins being asked about right now: Home showing and Home focusing ask at the same moment, once. */
const asking = new Set<string>();

/** The coins' prices now, as they come in; `refresh` asks again whatever their age, `refreshIfOld` only past a minute. */
export function usePrices(mints: string[]): { prices: Map<string, number | null>; refresh: () => Promise<void>; refreshIfOld: () => Promise<void> } {
  const key = [...new Set(mints)].sort().join(",");
  const [, setRead] = useState(0);

  const load = useCallback(
    async (force: boolean) => {
      const now = Date.now();
      const stale = key ? key.split(",").filter((m) => !asking.has(m) && (force || !(now - (cache.get(m)?.at ?? 0) < FRESH_MS))) : [];
      if (!stale.length) return;
      for (const m of stale) asking.add(m);
      const res = await fetchPrices(stale).finally(() => {
        for (const m of stale) asking.delete(m);
      });
      if (!res.ok) return;
      const at = Date.now();
      for (const m of stale) cache.set(m, { at, usd: res.value.prices[m] ?? null });
      setRead((n) => n + 1);
    },
    [key],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const prices = new Map<string, number | null>();
  for (const m of key ? key.split(",") : []) {
    const hit = cache.get(m);
    if (hit) prices.set(m, hit.usd);
  }
  return { prices, refresh: () => load(true), refreshIfOld: () => load(false) };
}
