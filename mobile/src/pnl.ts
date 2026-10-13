import { amount as fmtAmount, money, pct } from "./logic";

/**
 * YOUR APES, in dollars: every trade made through Spot, the book it adds up
 * to for each coin, and what that book is worth against today's price. On
 * the phone only, like everything else: Spot keeps no account.
 */

export interface Trade {
  id: string;
  at: string;
  owner: string;
  mint: string;
  symbol: string;
  icon: string | null;
  side: "buy" | "sell";
  /** Dollars in (a buy) or out (a sell). */
  usdc: number;
  /** Coins out (a buy) or in (a sell). */
  amount: number;
  /** Both read from the wallet, not from the quote. */
  exact: boolean;
  signature: string | null;
}

/** One coin's book: what Spot bought and sold of it, and what that left. */
export interface Book {
  mint: string;
  symbol: string;
  /** Coins bought through Spot and not sold yet. */
  held: number;
  /** What those cost, in dollars. */
  basis: number;
  /** Made or lost on what was sold, against what it cost. */
  realized: number;
  trades: number;
}

const EPS = 1e-9;

/**
 * THE BOOKS, one a coin, from the trades in the order they happened.
 * Average cost: a sell takes its share of what the held coins cost. Coins
 * the wallet got elsewhere cost nothing here, so a sell beyond what Spot
 * bought counts only the Spot part.
 */
export function books(trades: Trade[]): Map<string, Book> {
  const out = new Map<string, Book>();
  const sorted = [...trades].sort((a, b) => Date.parse(a.at) - Date.parse(b.at));
  for (const t of sorted) {
    const b = out.get(t.mint) ?? { mint: t.mint, symbol: t.symbol, held: 0, basis: 0, realized: 0, trades: 0 };
    b.trades += 1;
    if (t.side === "buy") {
      b.held += t.amount;
      b.basis += t.usdc;
    } else if (b.held > EPS && t.amount > 0) {
      const part = Math.min(t.amount, b.held);
      const proceeds = t.usdc * (part / t.amount);
      const cost = b.basis * (part / b.held);
      b.realized += proceeds - cost;
      b.basis -= cost;
      b.held -= part;
      if (b.held <= EPS) {
        b.held = 0;
        b.basis = 0;
      }
    }
    out.set(t.mint, b);
  }
  return out;
}

export interface Position {
  amount: number;
  usd: number;
}

/**
 * SINCE YOU APED: what the coins Spot bought and the wallet still holds are
 * worth now, against what they cost; null when Spot bought none of what is
 * held. The wallet may hold fewer than the book says (some sold elsewhere):
 * then only those are counted.
 */
export function since(b: Book, position: Position | null): { usd: number; pct: number | null } | null {
  if (b.held <= EPS || !position || !(position.amount > 0) || !(position.usd >= 0)) return null;
  const held = Math.min(b.held, position.amount);
  const cost = b.basis * (held / b.held);
  const usd = held * (position.usd / position.amount) - cost;
  return { usd, pct: cost > 0 ? (usd / cost) * 100 : null };
}

/** What a sale of `amount` coins for `usdc` makes against what Spot paid, or null when Spot bought none of them. */
export function saleGain(b: Book | undefined, amount: number, usdc: number): { usd: number; pct: number | null } | null {
  if (!b || b.held <= EPS || !(amount > 0)) return null;
  const part = Math.min(amount, b.held);
  const cost = b.basis * (part / b.held);
  const usd = usdc * (part / amount) - cost;
  return { usd, pct: cost > 0 ? (usd / cost) * 100 : null };
}

export interface Pnl {
  realized: number;
  open: number;
  all: number;
  trades: number;
}

export function pnlOf(trades: Trade[], positions: { token: { mint: string }; amount: number; usd: number }[]): Pnl {
  let realized = 0;
  let open = 0;
  let n = 0;
  for (const b of books(trades).values()) {
    realized += b.realized;
    n += b.trades;
    open += since(b, positions.find((p) => p.token.mint === b.mint) ?? null)?.usd ?? 0;
  }
  return { realized, open, all: realized + open, trades: n };
}

/** A gain or loss with its sign: +$12.40, −$0.07. */
export const gain = (n: number): string => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;

/** "+$0.40 (+4.0%)" */
export function sinceLine(s: { usd: number; pct: number | null }): string {
  return s.pct === null ? gain(s.usd) : `${gain(s.usd)} (${pct(s.pct)})`;
}

/** What went in and what came out, a tilde on figures the quote gave rather than the wallet. */
export function tradeLine(t: Trade): string {
  const q = t.exact ? "" : "~";
  const coins = `${q}${fmtAmount(t.amount)} ${t.symbol}`;
  const cash = `${q}${money(t.usdc)}`;
  return t.side === "buy" ? `${cash} → ${coins}` : `${coins} → ${cash}`;
}
