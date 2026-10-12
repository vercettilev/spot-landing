import { useCallback, useEffect, useRef, useState } from "react";
import { fetchHoldings, type ApiError } from "./api";
import type { Holdings } from "./types";

/* One bag per wallet, kept for half a minute so the Bag tab and a coin's
   Sell side read the same numbers without asking twice. */
const cache = new Map<string, { at: number; value: Holdings }>();
const FRESH_MS = 30_000;

export interface HoldingsState {
  status: "none" | "loading" | "done" | "error";
  value: Holdings | null;
  error: ApiError | null;
  refresh: () => Promise<void>;
}

export function useHoldings(owner: string | null): HoldingsState {
  const cached = owner ? cache.get(owner) : undefined;
  const [state, setState] = useState<Omit<HoldingsState, "refresh">>({
    status: owner ? (cached ? "done" : "loading") : "none",
    value: cached?.value ?? null,
    error: null,
  });
  const run = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      if (!owner) {
        setState({ status: "none", value: null, error: null });
        return;
      }
      const hit = cache.get(owner);
      if (!force && hit && Date.now() - hit.at < FRESH_MS) {
        setState({ status: "done", value: hit.value, error: null });
        return;
      }
      const id = ++run.current;
      setState((s) => ({ ...s, status: s.value ? "done" : "loading", error: null }));
      const res = await fetchHoldings(owner);
      if (id !== run.current) return;
      if (res.ok) {
        cache.set(owner, { at: Date.now(), value: res.value });
        setState({ status: "done", value: res.value, error: null });
      } else {
        setState((s) => ({ status: s.value ? "done" : "error", value: s.value, error: res.error }));
      }
    },
    [owner],
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  /* A bag replaced or dropped from outside (a trade landed, the watcher in
     pending.ts read a fresh one) reaches every screen showing it. */
  useEffect(() => {
    if (!owner) return;
    const fn = (o: string) => {
      if (o === owner) void load(false);
    };
    listeners.add(fn);
    return () => void listeners.delete(fn);
  }, [owner, load]);

  return { ...state, refresh: () => load(true) };
}

const listeners = new Set<(owner: string) => void>();
const notify = (owner: string) => {
  for (const fn of listeners) fn(owner);
};

/** Forget a wallet's bag, after a trade changed it: every screen showing it reads again. */
export function forgetHoldings(owner: string): void {
  cache.delete(owner);
  notify(owner);
}

/** A bag read elsewhere just now, handed to every screen showing it. */
export function primeHoldings(owner: string, value: Holdings): void {
  cache.set(owner, { at: Date.now(), value });
  notify(owner);
}
