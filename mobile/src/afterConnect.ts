/**
 * THE APE CONNECT ROSE FOR. A tap on Ape with no wallet of one's own opens
 * Connect; once the wallet is in and the money is there, the coin under the
 * sheet hears which ape was meant and goes on with it, so the first ape is
 * one tap, not two. The wallet still asks before anything moves.
 */

export interface ApeNext {
  mint: string;
  amount: number;
}

const listeners = new Set<(next: ApeNext) => void>();

export function apeAfterConnect(next: ApeNext): void {
  for (const fn of listeners) fn(next);
}

export function onApeAfterConnect(fn: (next: ApeNext) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}
