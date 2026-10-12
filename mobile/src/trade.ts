import { errorLine, type Answer, type ApiError } from "./api";
import type { Executed, Holdings, Order, TokenCard } from "./types";

/**
 * THE MONEY RULES, kept out of the screen so they can be tested: when a
 * trade has landed, when it has not, when nobody knows yet, and when a
 * quote is bad enough to stop and ask before the wallet opens.
 *
 * The one rule over all of them: a trade that may still land is never
 * offered again. A slow network turns "did it go through?" into a second
 * tap, and a second tap into a second, real, buy.
 */

export type Side = "buy" | "sell";

/**
 * HOW LONG A SIGNED ORDER CAN STILL LAND. Solana drops a transaction once
 * its blockhash is 150 blocks old, about a minute, and Jupiter takes a
 * fresh one when it builds the order. A minute and a half after that, an
 * order that has not landed never will.
 */
export const LAND_WINDOW_MS = 90_000;

/** The last look at the wallet comes a little after the window, for an RPC a block or two behind. */
export const LAST_LOOK_MS = 6_000;

/** What /api/execute's answer says about the money: it moved, it did not, or nobody knows yet. */
export function settled(res: Answer<Executed>): "landed" | "failed" | "unsure" {
  if (!res.ok) {
    /* Refused before anything reached Jupiter: nothing was sent. Every
       other failure (slow, offline, busy, a crash) may have been sent. */
    return res.error === "trading_closed" || res.error === "needs_key" ? "failed" : "unsure";
  }
  if (res.value.status === "Success") return "landed";
  return res.value.final ? "failed" : "unsure";
}

/** The two balances a trade moves, raw: the coin, and the USDC it was bought with or sold for. */
export interface Snapshot {
  coin: string;
  usdc: string;
}

export function snapshotOf(bag: Holdings | null | undefined, mint: string): Snapshot | null {
  if (!bag) return null;
  return { coin: bag.positions.find((p) => p.token.mint === mint)?.raw ?? "0", usdc: bag.usdc.raw };
}

const big = (raw: string) => BigInt(/^\d+$/.test(raw) ? raw : "0");

/**
 * DID IT LAND? Either side of the trade moving the right way says so: a buy
 * takes USDC and adds the coin, a sell the other way round. Both are read,
 * because a coin too new to price is missing from the bag's list while the
 * USDC it cost is not.
 */
export function moved(side: Side, before: Snapshot, after: Snapshot): boolean {
  const [coin0, coin1, usdc0, usdc1] = [before.coin, after.coin, before.usdc, after.usdc].map(big);
  return side === "buy" ? coin1! > coin0! || usdc1! < usdc0! : coin1! < coin0! || usdc1! > usdc0!;
}

/** What a quote pays out, in dollars, when that can be told before signing: a sell's USDC, a buy's coins at their price. */
export function quoteUsd(side: Side, order: Pick<Order, "outAmount">, token: Pick<TokenCard, "decimals" | "priceUsd">): number | null {
  if (!/^\d+$/.test(order.outAmount)) return null;
  const out = Number(order.outAmount);
  if (side === "sell") return out / 1e6;
  if (token.priceUsd === null || !(token.priceUsd > 0) || !(token.decimals > 0)) return null;
  return (out / 10 ** token.decimals) * token.priceUsd;
}

/** How much worse than the price a quote may be before Spot stops to ask. */
export const THIN = 0.15;

/**
 * A FILL TO ASK ABOUT. A thin pool pays far less than the coin's price says,
 * and a wallet's approval screen does not always show it. Under two dollars
 * the price itself is too rough to judge by.
 */
export function shortFill(expectedUsd: number, gotUsd: number | null): { expectedUsd: number; gotUsd: number } | null {
  if (gotUsd === null || !(expectedUsd >= 2)) return null;
  return gotUsd < expectedUsd * (1 - THIN) ? { expectedUsd, gotUsd } : null;
}

/** Why an order was not built, and that nothing left the wallet. */
export function orderErrorLine(error: ApiError, detail: Record<string, unknown> | undefined, side: Side): string {
  const said = typeof detail?.message === "string" ? detail.message : "";
  switch (error) {
    case "refused":
      if (/\bsol\b|lamport|rent|fee/i.test(said) && /insufficient|not enough/i.test(said)) return "Add a little SOL for fees first, about $1 worth.";
      if (/insufficient|not enough|balance/i.test(said)) return side === "buy" ? "Not enough USDC. Add cash, then ape." : "Your wallet holds less than that now. Refresh your bag.";
      return "Jupiter wouldn't take this trade. Try again.";
    case "busy":
      return "Spot is busy. Try again in a few seconds.";
    case "offline":
      return "No internet. Nothing was spent.";
    case "timeout":
      return "That took too long. Nothing was spent. Try again.";
    case "lookup_failed":
      return "Couldn't reach the market. Nothing was spent. Try again.";
    default:
      return errorLine(error);
  }
}

/** A trade the chain turned down. Nothing changed hands. */
export function failedLine(res: Answer<Executed>, side: Side): string {
  if (!res.ok) return errorLine(res.error);
  const nothing = side === "buy" ? "Nothing was bought." : "Nothing was sold.";
  return /slippage|price moved/i.test(res.value.error ?? "") ? `Price moved too fast. ${nothing} Try again.` : `Didn't go through. ${nothing}`;
}

/** How long a landed trade may take to show in the wallet before the button unlocks anyway. */
export const SETTLE_MS = 12_000;

/**
 * A trade the button waits on: one that may still land, or one that has
 * landed and is not in the wallet's numbers yet (a sell of "50%" worked out
 * from the old bag would sell the wrong amount). Held and watched in
 * pending.ts, from outside any screen.
 */
export interface Pending {
  owner: string;
  mint: string;
  token: TokenCard;
  side: Side;
  /** Jupiter or the chain already said it landed: only the bag is behind. */
  landed: boolean;
  /** The wallet before it, when it could be read. */
  before: Snapshot | null;
  /** When it can no longer land, or, once landed, when to stop waiting for the bag. */
  until: number;
  /** What to say once it has. */
  text: string;
  signature: string | null;
  /** What the quote said would move, in whole units, for when the wallet cannot say. */
  quote: { usdc: number; amount: number };
}

/** When the looking stops: a little after the window, for an RPC a block or two behind. */
export const deadlineOf = (p: Pending): number => p.until + (p.landed ? 0 : LAST_LOOK_MS);

export const secondsLeft = (p: Pending, now: number): number => Math.max(0, Math.ceil((deadlineOf(p) - now) / 1000));

/** What became of a pending trade: it landed, it never will, or the wallet could not be read to tell. */
export type Fate = "landed" | "lost" | "unread";

/**
 * THE VERDICT ON A PENDING TRADE from one more look at the wallet; null
 * means keep looking. A trade that already landed is only waiting for the
 * bag, so its deadline ends the wait, never the trade.
 */
export function fateOf(p: Pending, after: Snapshot | null, now: number): Fate | null {
  if (after && p.before && moved(p.side, p.before, after)) return "landed";
  if (now <= deadlineOf(p)) return null;
  if (p.landed) return "landed";
  return after && p.before ? "lost" : "unread";
}

/** What a trade turned out to move, in whole units. */
export interface Fill {
  usdc: number;
  amount: number;
  /** Both sides read from the wallet, not the quote. */
  exact: boolean;
}

const ZERO = BigInt(0);
const units = (raw: bigint, decimals: number) => Number(raw < ZERO ? -raw : raw) / 10 ** decimals;

/**
 * THE FILL, from the wallet before and after: exact where a balance moved,
 * the quote's figure where one did not show (a coin Jupiter cannot price is
 * missing from the bag's list; the USDC it cost is not).
 */
export function fillOf(p: Pending, after: Snapshot): Fill {
  if (!p.before) return { ...p.quote, exact: false };
  const coin = big(after.coin) - big(p.before.coin);
  const cash = big(after.usdc) - big(p.before.usdc);
  const amount = coin === ZERO ? null : units(coin, p.token.decimals);
  const usdc = cash === ZERO ? null : units(cash, 6);
  return { usdc: usdc ?? p.quote.usdc, amount: amount ?? p.quote.amount, exact: usdc !== null && amount !== null };
}

export function fateLine(p: Pending, fate: Fate): string {
  switch (fate) {
    case "landed":
      return `${p.text}.`;
    case "lost":
      return `Didn't go through. Nothing was ${p.side === "buy" ? "bought" : "sold"}.`;
    default:
      return "Couldn't read your wallet. Check your bag before you go again.";
  }
}
