/**
 * CASH IN. SOL turned into cash has landed. It is not a trade, so no moment
 * takes the screen: the Turn key says it, or a toast when it landed after
 * the user moved on (TradeWatch), and the sheet that waited on it goes,
 * back to the coin with its key ready.
 */

const listeners = new Set<(usdc: number) => void>();

export function cashIn(usdc: number): void {
  for (const fn of listeners) fn(usdc);
}

/** Hears the cash land: a sheet waiting on it closes. */
export function onCashIn(fn: (usdc: number) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
