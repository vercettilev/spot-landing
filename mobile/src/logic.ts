import type { Candidate, Check, CheckId, Holding, Holdings, Level, Platform, Share, Sniff, Source, TokenCard } from "./types";

/**
 * The decisions behind the screen, kept free of React Native so they can be
 * tested in plain Node: what a share becomes, which amounts a coin allows,
 * how numbers read, and what the one button says.
 */

/** A share sheet's payload as /api/resolve takes it, or null when it carried nothing. */
export function fromShare(intent: { text?: string | null; webUrl?: string | null } | null | undefined): Share | null {
  const url = intent?.webUrl?.trim() || undefined;
  const text = intent?.text?.trim() || undefined;
  if (!url && !text) return null;
  return { ...(url ? { url } : {}), ...(text && text !== url ? { text } : {}), from: "share" };
}

/** A paste: a lone link is a link; anything else (a CA, a cashtag, a message) is text. */
export function fromPaste(input: string): Share | null {
  const s = input.trim();
  if (!s) return null;
  return /^https?:\/\/\S+$/i.test(s) ? { url: s, from: "paste" } : { text: s, from: "paste" };
}

/** The landing's buy sheet: 10, 25, 50 USDC. */
export const CHIPS = [10, 25, 50] as const;
export const DEFAULT_AMOUNT = 25;

/**
 * The chips a coin allows. A warned coin has a cap: chips above it go, and
 * the cap itself becomes the last chip, so the most allowed is one tap away.
 */
export function chipsFor(cap: number | null): number[] {
  if (cap === null) return [...CHIPS];
  if (cap <= 0) return [];
  return [...CHIPS.filter((c) => c < cap), cap].slice(-3);
}

export interface Chip {
  usd: number;
  /** All one buy can spend, in place of a chip the wallet can't cover. */
  max?: true;
}

/**
 * The chips a buy offers: the coin's (chipsFor), with Max in place of the
 * biggest when the wallet can't cover it, so a short wallet apes all it
 * has in one tap instead of meeting Add cash. A wallet that covers every
 * chip finds Max on the keypad: all of a big bag is a deliberate tap away.
 * `most` is maxApe's, and null without a wallet whose money has been read.
 */
export function amountChips(cap: number | null, most: number | null): Chip[] {
  const chips: Chip[] = chipsFor(cap).map((usd) => ({ usd }));
  const biggest = chips[chips.length - 1];
  if (most === null || !biggest || biggest.usd <= most || chips.some((c) => c.usd === most)) return chips;
  return [...chips.slice(0, -1), { usd: most, max: true }];
}

export function clampAmount(amount: number, cap: number | null): number {
  return cap === null ? amount : Math.min(amount, cap);
}

/**
 * THE MOMENT after a trade lands, in three lines: the word, the loud
 * figure, and the small one. A sell leads with what it made since the ape
 * when Spot knows; a loss is said plainly and without a sting.
 */
export interface MomentData {
  kind: "ape" | "sell";
  symbol: string;
  usdc: number;
  amount: number;
  gain?: { usd: number; pct: number | null } | null;
}

export interface MomentLines {
  head: string;
  big: string;
  small: string;
  /** The colour says the outcome: green for a sell that made money, orange for Spot's own moment. Never red. */
  backdrop: "orange" | "green";
}

const signed = (n: number) => `${n < 0 ? "−" : "+"}${money(Math.abs(n))}`;

export function momentLines(m: MomentData): MomentLines {
  const coins = `${amount(m.amount)} ${m.symbol}`;
  if (m.kind === "ape") return { head: "Aped.", big: `${money(m.usdc)} → ${coins}`, small: "In your bag. Sniffed for rugs first.", backdrop: "orange" };
  const trade = `${coins} → ${money(m.usdc)}`;
  /* Where the money went, in so many words: a sell's dollars stay in the wallet, as cash, not in a bank. */
  const back = `${money(m.usdc)} is back in your wallet as cash.`;
  if (!m.gain) return { head: "Sold.", big: trade, small: "Back in your wallet as cash.", backdrop: "orange" };
  const figure = m.gain.pct === null ? signed(m.gain.usd) : `${signed(m.gain.usd)} (${pct(m.gain.pct)})`;
  return m.gain.usd >= 0
    ? { head: "Sold.", big: figure, small: `since you aped\n${back}`, backdrop: "green" }
    : { head: "Sold.", big: figure, small: `It happens.\n${back}`, backdrop: "orange" };
}

/** The card people post: one figure, one line under it, and where it came from. */
export interface CardLines {
  figure: string;
  line: string;
  foot: string;
  tint: "orange" | "green";
}

export function cardLines(m: MomentData): CardLines {
  if (m.kind === "ape") return { figure: "Aped.", line: `${money(m.usdc)} of $${m.symbol}`, foot: "Sniffed for rugs first.", tint: "orange" };
  if (!m.gain) return { figure: "Sold.", line: `${amount(m.amount)} ${m.symbol} → ${money(m.usdc)}`, foot: "", tint: "orange" };
  const won = m.gain.usd >= 0;
  return {
    figure: m.gain.pct === null ? signed(m.gain.usd) : pct(m.gain.pct),
    line: `${signed(m.gain.usd)} on $${m.symbol}\nsince I aped`,
    foot: won ? "Sniffed for rugs first." : "It happens.",
    tint: won ? "green" : "orange",
  };
}

/** The same, as words, for a share sheet with no picture. */
export function shareText(m: MomentData): string {
  const c = cardLines(m);
  const line = c.line.replace("\n", " ");
  const word = /\.$/.test(c.figure);
  return [word ? `${c.figure} ${line}.` : `${c.figure}: ${line}.`, c.foot, "usespot.fun"].filter(Boolean).join(" ");
}

/* How wide Rubik Black sets each kind of character, in ems: digits are
   wide in it, so "+49.6%" does not fit where "Aped." does. */
const EM: Record<string, number> = { "+": 0.6, "−": 0.64, ".": 0.31, ",": 0.3, "%": 0.85, $: 0.71, " ": 0.19 };
const emOf = (ch: string) => EM[ch] ?? (/[0-9]/.test(ch) ? 0.7 : /[A-Z]/.test(ch) ? 0.75 : 0.64);

/** The biggest size, up to `max`, at which the card's figure fits in `width` pixels, with the card's tight letter spacing. */
export function fitFigure(figure: string, width: number, max = 132, letterSpacing = -5): number {
  const ems = [...figure].reduce((sum, ch) => sum + emOf(ch), 0);
  if (!(ems > 0)) return max;
  return Math.max(40, Math.min(max, Math.floor((width - letterSpacing * (figure.length - 1)) / ems)));
}

/**
 * THE RECEIPT, SHORTENED: only what isn't a clean "No" shows; everything
 * that passed folds under one line, there to open. A clean coin reads as
 * its stamp and one line; a risky one shows its reasons, never hides them.
 */
export function foldChecks(checks: Check[]): { shown: Check[]; folded: Check[] } {
  const all = ordered(checks);
  return { shown: all.filter((c) => c.status !== "good"), folded: all.filter((c) => c.status === "good") };
}

/** The line a receipt's folded checks sit under: all of them, or the rest. */
export const moreChecks = (n: number, all = false): string =>
  all ? (n === 1 ? "1 check, clear" : `All ${n} checks clear`) : `${n} more check${n === 1 ? "" : "s"} clear`;

/** Under a coin's symbol: its name (a stock coin says it is one). */
export function coinLine(t: { name: string; kind: string }): string {
  return t.kind === "stock" ? `${t.name}, a stock coin` : t.name;
}

/** The landing's four questions first, in its order, then what else the sniff found. */
const ORDER: CheckId[] = ["route", "honeypot", "freeze", "mint", "holders", "delegate", "liquidity", "age", "tax", "hook", "flagged"];

export function ordered(checks: Check[]): Check[] {
  return [...checks].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
}

const SUB = "₀₁₂₃₄₅₆₇₈₉";

/** Sizes in dollars the way CT reads them: $220.0M, $6.6M, $4.2k, $900. */
export function usd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${Math.round(Math.max(n, 0))}`;
}

/** A row's worth: whole dollars, and the cents under a dollar, so a coin worth $0.27 doesn't read $0. */
export function worth(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n > 0 && n < 1) return n < 0.01 ? "<$0.01" : `$${n.toFixed(2)}`;
  return usd(n);
}

/** A bag's worth, to the cent, the way a wallet shows it: $1,077.10. Past a million it reads like usd(). */
export function money(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e6) return usd(n);
  return `$${Math.max(n, 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * A price: cents above a dollar, four significant digits below it, and a
 * coin worth a sliver of a cent with its zeros counted, $0.0₅1234, the way
 * DEX screens write it.
 */
export function price(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e3) return usd(n);
  if (n >= 1) return `$${n.toFixed(2)}`;
  if (n <= 0) return "$0";
  let zeros = Math.ceil(-Math.log10(n)) - 1;
  if (zeros < 4) return `$${parseFloat(n.toPrecision(4))}`;
  let digits = Math.round(n * 10 ** (zeros + 4)).toString();
  if (digits.length > 4) {
    zeros -= 1;
    digits = "1000";
  }
  return `$0.0${[...String(zeros)].map((d) => SUB[Number(d)]).join("")}${digits}`;
}

/** A change in percent, signed, with a real minus. */
export function pct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  const s = abs >= 100 ? Math.round(abs).toString() : abs.toFixed(1);
  return `${n >= 0 ? "+" : "−"}${s}%`;
}

/** Holders and other counts: 38, 1.4k, 267k, 1.2M. */
export function count(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e4) return `${Math.round(n / 1e3)}k`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}k`;
  return String(Math.round(n));
}

const PLATFORM: Record<Platform, string> = {
  x: "X",
  tiktok: "TikTok",
  youtube: "YouTube",
  telegram: "Telegram",
  reddit: "Reddit",
  instagram: "Instagram",
  web: "the web",
  text: "a share",
};

/** The line under the coin: whose post it came from, the way the landing's banner says it. */
export function sourceLine(source: Source, share: Share): string {
  if (source.author && source.platform !== "web" && source.platform !== "text") {
    return `from ${source.author} on ${PLATFORM[source.platform]}`;
  }
  if (source.author) return `from ${source.author}`;
  if (source.url) {
    try {
      return `from ${new URL(source.url).hostname.replace(/^www\./, "")}`;
    } catch {
      /* fall through */
    }
  }
  if (share.from === "try") return "from Spot";
  return share.from === "paste" ? "from your paste" : share.from === "screenshot" ? "from your screenshot" : "from your share";
}

export const SOL_MINT = "So11111111111111111111111111111111111111112";
const SOL_ICON = "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";
/* SOL a sell or a swap never takes: the 0.01 SOL Jupiter's own swap keeps
   back when you sell all of it, so the next trade can pay its way. */
const SOL_KEPT = 0.01;

/**
 * SOL IN THE BAG, as the coin it is: its own row, its own screen, apes and
 * sells like any other. Its card is the server's when it sent one, else one
 * made from its price.
 */
export function solHolding(sol: Holdings["sol"]): Holding | null {
  if (!(sol.amount > 0) || sol.usd === null || sol.usd < 0.01) return null;
  const price = sol.token?.priceUsd ?? sol.usd / sol.amount;
  const token: TokenCard = sol.token ?? {
    mint: SOL_MINT,
    symbol: "SOL",
    name: "Solana",
    icon: SOL_ICON,
    decimals: 9,
    kind: "coin",
    priceUsd: price,
    mcapUsd: null,
    liquidityUsd: null,
    holders: null,
    change24hPct: null,
    verified: true,
    issuer: null,
    restrictions: [],
  };
  return { token, amount: sol.amount, raw: String(Math.floor(sol.amount * 1e9)), usd: sol.usd };
}

/** SOL's dollars a trade can spend: all of it but the 0.01 SOL kept back. */
export function spareSol(sol: Holdings["sol"]): number {
  if (sol.usd === null || !(sol.amount > SOL_KEPT)) return 0;
  return sol.usd * (1 - SOL_KEPT / sol.amount);
}

/**
 * WHAT A SELL TAKES, as Jupiter's own swap has it: a share is a share of
 * all of it, and all of SOL is all but the 0.01 SOL kept back. The trade
 * reads its raw amount from what this returns, and the key its dollars.
 */
export function saleOf(h: Holding, pct: number): Holding {
  if (h.token.mint !== SOL_MINT || pct < 100) return h;
  const raw = BigInt(/^\d+$/.test(h.raw) ? h.raw : "0");
  const kept = BigInt(Math.round(SOL_KEPT * 1e9));
  const left = raw > kept ? raw - kept : BigInt(0);
  const part = raw > BigInt(0) ? Number(left) / Number(raw) : 0;
  return { ...h, amount: h.amount * part, raw: left.toString(), usd: Math.round(h.usd * part * 100) / 100 };
}

/** The share of a holding a typed dollar amount sells: all of it, once that is what all of it brings. */
export function sellShare(h: Holding, dollars: number): number {
  if (!(dollars > 0)) return 0;
  const all = saleOf(h, 100);
  if (dollars >= all.usd) return 100;
  const pct = shareFor(dollars, h.usd);
  return BigInt(shareOf(h.raw, pct)) >= BigInt(all.raw) ? 100 : pct;
}

/** A bag's coins with SOL among them, the biggest first: what Home lists, and what its all-time figure counts. */
export function coinsOf(bag: Holdings): Holding[] {
  const sol = solHolding(bag.sol);
  return sol ? [...bag.positions, sol].sort((x, y) => y.usd - x.usd) : bag.positions;
}

/** Coins waiting in Jupiter's vault to sell at 2x, as the bag counts them. */
export interface Vaulted {
  mint: string;
  symbol: string;
  icon: string | null;
  decimals: number;
  amount: number;
}

/**
 * THE BAG WITH THE VAULT IN IT. Coins waiting in Jupiter's vault for a 2x
 * sell are still the wallet's: each coin's row counts them (and says how
 * many wait there), at the price the bag has for it, or the price given
 * when the wallet holds none of it any more, and the total grows by the
 * same. `added` is what the vault adds to the bag's worth.
 */
export function withVault(rows: Holding[], vault: Vaulted[], prices: Map<string, number | null>): { rows: (Holding & { vaulted: number })[]; added: number } {
  const waiting = new Map<string, number>();
  for (const v of vault) waiting.set(v.mint, (waiting.get(v.mint) ?? 0) + v.amount);
  let added = 0;
  const out: (Holding & { vaulted: number })[] = rows.map((r) => {
    const vaulted = waiting.get(r.token.mint) ?? 0;
    waiting.delete(r.token.mint);
    if (!vaulted) return { ...r, vaulted: 0 };
    const priceNow = r.amount > 0 ? r.usd / r.amount : (r.token.priceUsd ?? prices.get(r.token.mint) ?? 0);
    added += vaulted * priceNow;
    return { ...r, amount: r.amount + vaulted, usd: r.usd + vaulted * priceNow, vaulted };
  });
  for (const [mint, vaulted] of waiting) {
    const v = vault.find((x) => x.mint === mint)!;
    const priceNow = prices.get(mint) ?? null;
    const usd = priceNow === null ? 0 : vaulted * priceNow;
    added += usd;
    out.push({
      token: { mint, symbol: v.symbol, name: v.symbol, icon: v.icon, decimals: v.decimals, kind: "coin", priceUsd: priceNow, mcapUsd: null, liquidityUsd: null, holders: null, change24hPct: null, verified: false, issuer: null, restrictions: [] },
      amount: vaulted,
      raw: "0",
      usd,
      vaulted,
    });
  }
  return { rows: out.sort((x, y) => y.usd - x.usd), added };
}

/** SOL held, as the coin screen trades it: only while there is more than the 0.01 SOL a sell keeps back. */
export function solPosition(mint: string, bag: Holdings | null | undefined): Holding | null {
  if (mint !== SOL_MINT || !bag) return null;
  const held = solHolding(bag.sol);
  return held && saleOf(held, 100).raw !== "0" ? held : null;
}

/** One name for every coin offered: a cashtag that several launches share, not a share that names several coins. */
export function sameName(candidates: Candidate[]): boolean {
  return candidates.length > 1 && new Set(candidates.map((c) => c.token.symbol.toLowerCase())).size === 1;
}

export interface Action {
  label: string;
  enabled: boolean;
  tone: "go" | "buy" | "sell" | "growl" | "stop" | "wait" | "quiet";
}

/**
 * The one button, in dollars (USDC is a dollar): "Ape $25". A blocked coin
 * never gets a button that looks pressable.
 */
/** The key when the sniff failed: it sniffs again. */
export const SNIFF_AGAIN = "Sniff again";

export function actionFor(state: "loading" | "error" | Level, amount: number): Action {
  switch (state) {
    case "loading":
      return { label: "Sniffing…", enabled: false, tone: "wait" };
    case "ok":
      return { label: `Ape $${amount}`, enabled: true, tone: "buy" };
    case "warn":
      return { label: `GRRR. Ape $${amount}`, enabled: true, tone: "growl" };
    case "block":
      return { label: "Spot won't buy this", enabled: false, tone: "stop" };
    default:
      return { label: SNIFF_AGAIN, enabled: true, tone: "wait" };
  }
}

/** How long ago, the way a feed says it: now, 5m, 3h, 2d, 6w. */
export function ago(iso: string, now = Date.now()): string {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000);
  if (!Number.isFinite(s) || s < 60) return "now";
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 86400 * 14) return `${Math.floor(s / 86400)}d`;
  return `${Math.floor(s / (86400 * 7))}w`;
}

/** How far a coin has gone since it was sniffed, in percent; null when either price is missing. */
export function sinceSniff(then: number | null | undefined, now: number | null | undefined): number | null {
  if (then == null || now == null || !(then > 0) || !(now >= 0)) return null;
  return ((now - then) / then) * 100;
}

/** A sniffed coin's line in Sniffed lately: how far it has gone in the time since ("+42% in 2h"), or only the time. */
export function sniffedLine(change: number | null, when: string): string {
  return change === null || when === "now" ? when : `${pct(change)} in ${when}`;
}

/** A verdict as one word on a chip. */
export function verdictWord(level: Level): { word: string; status: "good" | "warn" | "bad" | "unknown" } {
  switch (level) {
    case "ok":
      return { word: "Clean", status: "good" };
    case "warn":
      return { word: "GRRR", status: "warn" };
    case "block":
      return { word: "NOPE", status: "bad" };
    default:
      return { word: "?", status: "unknown" };
  }
}

/** Coins held, the way a wallet says it: 6,250 or 0.0015 or 1.2M. */
export function amount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1000) return Math.round(n).toLocaleString("en-US");
  if (n >= 1) return (Math.round(n * 100) / 100).toString();
  return parseFloat(n.toPrecision(3)).toString();
}

/** The raw amount for a share of a holding, rounded down so it never asks for more than is there. */
export function shareOf(raw: string, pctOf100: number): string {
  if (!/^\d+$/.test(raw)) return "0";
  if (pctOf100 >= 100) return raw;
  return ((BigInt(raw) * BigInt(Math.round(pctOf100 * 100))) / BigInt(10000)).toString();
}

/** Jupiter's smallest trigger order, in dollars of what goes in. */
export const HALF_FLOOR_USD = 10;

/** A 2x sell to offer: half of what Spot bought, at twice what it cost on average. */
export interface HalfPlan {
  /** Base units into Jupiter's vault. */
  raw: string;
  amount: number;
  /** The price it sells at: twice the average cost. */
  priceUsd: number;
  /** Dollars it brings back when it sells: what the coins cost. */
  back: number;
}

/**
 * SELL HALF AT 2X: of the coins Spot bought and the wallet still holds,
 * half, at twice what they cost on average, so the sale brings back what
 * all of them cost and the rest rides free. Null when there is nothing to
 * offer: Spot bought none of it, the half is under Jupiter's $10 floor
 * (with room for the price to slip before it lands), or the price is past
 * 2x already, when selling half is the Sell key's job.
 */
export function halfAt2x(book: { held: number; basis: number } | undefined, holding: { amount: number; raw: string; usd: number } | null): HalfPlan | null {
  if (!book || !holding || !(book.held > 0) || !(book.basis > 0) || !(holding.amount > 0) || !(holding.usd > 0)) return null;
  const held = Math.min(book.held, holding.amount);
  const share = Math.min(100, (held / 2 / holding.amount) * 100);
  const raw = shareOf(holding.raw, share);
  if (!/^\d+$/.test(raw) || BigInt(raw) <= 0n) return null;
  const amountHalf = held / 2;
  const priceUsd = (2 * book.basis) / book.held;
  const priceNow = holding.usd / holding.amount;
  if (amountHalf * priceNow < HALF_FLOOR_USD * 1.05 || priceNow >= priceUsd) return null;
  return { raw, amount: amountHalf, priceUsd, back: amountHalf * priceUsd };
}

/**
 * WHAT BECAME OF A 2X SELL, by Jupiter's word: still waiting, sold (and for
 * what), ended with the coins still in the vault (expired, or failed: both
 * are taken back the same way), or gone back to the wallet. A state Jupiter
 * adds later reads as waiting until it says more.
 */
export function halfFate(o: { orderState: string; inputUsed?: string | null; outputAmount?: string | null }, decimals: number): { state: "open" | "expired" | "gone" } | { state: "sold"; usdc: number; amount: number } {
  const units = (raw: string | null | undefined, d: number) => (raw && /^\d+$/.test(raw) ? Number(raw) / 10 ** d : 0);
  switch (o.orderState) {
    case "filled":
      return { state: "sold", usdc: units(o.outputAmount, 6), amount: units(o.inputUsed, decimals) };
    case "expired":
    case "failed":
      return { state: "expired" };
    case "cancelled":
      return { state: "gone" };
    default:
      return { state: "open" };
  }
}

/** The 2x card on a coin, in words: on offer, waiting in the vault, or ended there. */
export function halfCard(
  h: { state: "offer" | "open" | "expired" | "cancelling"; symbol: string; amount: number; priceUsd: number; back: number; expiresAt?: number },
  now = Date.now(),
): { title: string; line: string; key: string | null } {
  const coins = `${amount(h.amount)} ${h.symbol}`;
  switch (h.state) {
    case "offer":
      return { title: "Never round-trip a 2x", line: `Half sells when it doubles: your ${money(h.back)} back, the rest rides free. That half waits in Jupiter's vault.`, key: "Sell half at 2x" };
    case "open": {
      const days = h.expiresAt ? Math.max(0, Math.ceil((h.expiresAt - now) / 86_400_000)) : null;
      return { title: `Half sells at ${price(h.priceUsd)}`, line: `${coins} in Jupiter's vault until it does${days === null ? "" : days <= 1 ? ", for a day more" : `, for ${days} days more`}.`, key: "Cancel" };
    }
    case "expired":
      return { title: "The 2x sell ran out", line: `${coins} wait in Jupiter's vault.`, key: "Get them back" };
    case "cancelling":
      return { title: "Taking them back", line: `${coins} come back from Jupiter's vault.`, key: null };
  }
}

/* expo-share-intent hands a shared image over as a file:// URI, and the text
   reader on Android opens a content:// URI or a bare path, so the scheme
   comes off first. */
export function readablePath(uri: string, os: string): string {
  return os === "android" && uri.startsWith("file://") ? uri.slice("file://".length) : uri;
}

/** What tells same-named coins apart, under each in "which one?": its name, its size, its holders. */
/** A coin's age, short: 40m, 5h, 275d, 2y. */
export function shortAge(ms: number): string {
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${Math.max(m, 1)}m`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h`;
  const d = Math.floor(h / 24);
  return d < 730 ? `${d}d` : `${Math.floor(d / 365)}y`;
}

/** A coin sized up in one line, the way CT reads it: MC $108.5M · Liq $631.2k · 47k holders · 275d. What isn't known is left out. */
export function statsLine(t: { mcapUsd: number | null; liquidityUsd: number | null; holders: number | null }, ageMs: number | null): string {
  return [
    t.mcapUsd !== null ? `MC ${usd(t.mcapUsd)}` : null,
    t.liquidityUsd !== null ? `Liq ${usd(t.liquidityUsd)}` : null,
    t.holders !== null ? `${count(t.holders)} holders` : null,
    ageMs !== null && ageMs >= 0 ? shortAge(ageMs) : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

export function candidateLine(t: { name: string; mcapUsd: number | null; holders: number | null }): string {
  const parts = [t.mcapUsd !== null ? `${usd(t.mcapUsd)} market cap` : null, t.holders !== null ? `${count(t.holders)} holders` : null].filter(Boolean);
  return parts.length ? `${t.name}. ${parts.join(", ")}` : t.name;
}

/** The receipt's line under the stamp: the stamp already says GRRR, so the line doesn't say it twice. */
export function verdictHead(level: Level, headline: string): string {
  if (level !== "warn") return headline;
  /* "Ape $50 max." read as a suggestion to spend $50; it is a cap. */
  return headline.replace(/^GRRR\.\s*/, "").replace(/\bApe \$(\d[\d,]*) max\./, "Spot caps buys at $$$1.") || headline;
}

/** The question a bad quote asks, in plain words: no "thin pool" over a receipt that may say the pool is big. */
export const plainShortFill = (line: string): string => line.replace(/^Thin pool\.\s*/, "Bad price right now. ");

/* ---- the dock: the key, the line under it, and the amount being typed ---- */

/** The most one trade can be, on the server ($1 to $10,000). */
export const MAX_TRADE = 10_000;

/** Dollars the way a button says them: cents under $10 ($0.42), round past that ($15, $1.2k), and "about" rather than "~", which the key's heavy face draws as a minus. */
export const approx = (n: number): string => `about ${n < 10 ? money(n) : usd(n)}`;

/** A share of a holding in words: "all", "50%", "48.4%". */
export function shareWord(pctOf100: number): string {
  if (pctOf100 >= 100) return "all";
  return `${Number(pctOf100.toFixed(1))}%`;
}

/** The share of a holding a dollar amount is, to a tenth of a percent, never more than all of it. */
export function shareFor(dollars: number, holdingUsd: number): number {
  if (!(holdingUsd > 0) || !(dollars > 0)) return 0;
  if (dollars >= holdingUsd) return 100;
  return Math.max(0.1, Math.round((dollars / holdingUsd) * 1000) / 10);
}

export interface DockState {
  side: "buy" | "sell";
  sniff: "loading" | "error" | Level;
  /** Dollars a buy would spend. */
  amount: number;
  /** The keypad is open with nothing typed yet. */
  empty?: boolean;
  wallet: "none" | "watch" | "mwa";
  /** USDC in the wallet, in dollars, once the bag is read. */
  cash: number | null;
  /** SOL a buy can spend, in dollars, once the bag is read: all of it but the 0.01 SOL kept back, and none on SOL itself. */
  sol: number | null;
  /** What this buy costs in SOL, when it is paid in SOL. */
  solCost: number | null;
  restricted: boolean;
  busy: boolean;
  /** A trade that may still land (or has, and the bag is behind), and the seconds left on it. */
  checking: { landed: boolean; seconds: number } | null;
  /** What the wallet holds of the coin, in dollars; null when none. */
  held: number | null;
  sellPct: number;
}

/** A buy can be sized: the coin is clean or growls, and it may be sold to this user. */
export const canSize = (s: Pick<DockState, "sniff" | "restricted">): boolean => (s.sniff === "ok" || s.sniff === "warn") && !s.restricted;

/**
 * WHAT A BUY IS PAID IN. USDC when it covers the ape, else SOL when what can
 * be spent of it does: one swap and one approval either way. Null when
 * neither covers it on its own, or the bag isn't read yet.
 */
export function payFor(s: Pick<DockState, "amount" | "cash" | "sol">): "usdc" | "sol" | null {
  if (s.cash !== null && s.cash >= s.amount) return "usdc";
  if (s.sol !== null && s.sol >= s.amount) return "sol";
  return null;
}

/** Short of both USDC and SOL for the ape: the one thing to do is add cash. */
export const needsCash = (s: DockState): boolean =>
  s.side === "buy" && canSize(s) && s.wallet === "mwa" && s.cash !== null && payFor(s) === null;

/**
 * THE KEY. In order: a trade that may still land locks it, whatever else
 * is true; an empty keypad waits for a number; a sell says what it sells for; a buy is refused to the US on a
 * coin that isn't sold there, waits while it is sent, asks for cash when
 * short, and otherwise says what the sniff allows.
 */
export function dockKey(s: DockState): Action {
  if (s.checking) return { label: s.checking.landed ? "Updating your bag…" : `Checking… ${s.checking.seconds}s left`, enabled: false, tone: "wait" };
  if (s.empty) return { label: "Type an amount", enabled: false, tone: "stop" };
  if (s.side === "sell") {
    /* A tracked wallet's coins are only seen: the key is the way to trade them. */
    if (s.wallet === "watch") return { label: "Connect to sell", enabled: true, tone: "go" };
    if (s.busy) return { label: "Selling…", enabled: false, tone: "wait" };
    if (s.held === null) return { label: "Counting your bag…", enabled: false, tone: "wait" };
    return { label: `Sell ${shareWord(s.sellPct)} for ${approx((s.held * s.sellPct) / 100)}`, enabled: true, tone: "sell" };
  }
  if (s.restricted) return { label: "Not for US users", enabled: false, tone: "stop" };
  if (s.wallet === "watch" && canSize(s)) return { label: "Connect to ape", enabled: true, tone: "go" };
  if (s.busy) return { label: "Aping…", enabled: false, tone: "wait" };
  /* Short of cash with the coin already in the bag (as right after an ape): the next thing is not
     to pay again, so the way to add cash is there but quiet. */
  if (needsCash(s)) return s.held !== null ? { label: "Add cash to ape more", enabled: true, tone: "quiet" } : { label: "Add cash", enabled: true, tone: "go" };
  return actionFor(s.sniff, s.amount);
}

/** The line under the key: what happens next, or what to do instead. */
/**
 * THE LINE UNDER THE KEY, only when there is something to know or to do
 * first: a trade still landing, the US, short of cash, an ape paid in SOL.
 * Otherwise the key says it all, and there is no line.
 */
export function dockNote(s: DockState): string | null {
  if (s.checking) return s.checking.landed ? "Done. Your bag catches up in a sec." : "Making sure it went through. You can leave, Spot will tell you.";
  if (s.side === "sell") return null;
  if (s.sniff === "block") return null;
  /* The key already says who it isn't for; the line says why this user, and where to change it. */
  if (s.restricted) return "You said you're in the US. Change that in Settings.";
  /* What is held is over the key already; the line says the way out. */
  if (needsCash(s) && s.held !== null) return "Sell it anytime: tap Sell below.";
  if (needsCash(s)) return `Only ${money(s.cash)} in USDC${s.sol !== null && s.sol >= 1 ? ` and ${money(s.sol)} in SOL` : ""}. Add cash, then ape.`;
  /* Paid in SOL, said the way Jupiter says it. */
  if (s.wallet === "mwa" && canSize(s) && s.solCost !== null && payFor(s) === "sol") return `You pay about ${amount(s.solCost)} SOL.`;
  return null;
}

/**
 * A digit typed on the keypad: no leading zeros, and nothing past the most
 * allowed (the digit is refused, and `over` says why nothing happened).
 */
export function typeDigit(current: string, digit: string, max: number): { next: string; over: boolean } {
  if (!/^\d$/.test(digit) || (current === "" && digit === "0")) return { next: current, over: false };
  const next = current + digit;
  return Number(next) > max ? { next: current, over: true } : { next, over: false };
}

/* SOL is turned into dollars at the price of the moment the order is built, which may be a little under the bag's: Max paid in SOL leaves this much of it unspent. */
const SOL_MARGIN = 0.01;

/** The most a buy can be: the cap on a coin that growls, the server's limit, and the cash when it is read (`inSol` when it is SOL that pays). Null when there is no sensible most to offer. */
export function maxApe(cash: number | null, cap: number | null, inSol = false): number | null {
  const limit = Math.min(cap ?? MAX_TRADE, MAX_TRADE);
  const spend = cash === null ? null : inSol ? cash * (1 - SOL_MARGIN) : cash;
  if (spend !== null && spend >= 1) return Math.floor(Math.min(spend, limit));
  return cap !== null && cap >= 1 ? Math.floor(limit) : null;
}

/** The line under the amount being typed. `over` when the last digit was refused; `share`, the share a typed sell takes, when it is not just the typed dollars' share. */
export function padHint(p: { side: "buy" | "sell"; typed: number | null; over: boolean; cap: number | null; cash: number | null; held: number | null; share?: number; inSol?: boolean }): string {
  if (p.side === "sell") {
    if (p.held === null) return "";
    if (p.typed !== null && !p.over) return `${shareWord(p.share ?? shareFor(p.typed, p.held))} of your ${money(p.held)}.`.replace(/^all of/, "All of");
    return `You hold ${money(p.held)}.`;
  }
  if (p.over) return p.cap !== null ? `Spot caps this one at $${p.cap}.` : `Up to $${MAX_TRADE.toLocaleString("en-US")} a trade.`;
  const what = p.cash !== null ? `${money(p.cash)}${p.inSol ? " in SOL" : ""}` : "";
  if (p.cash !== null && p.typed !== null && p.typed > p.cash) return `More than your ${what}. Add cash first.`;
  if (p.cap !== null) return `Spot caps this one at $${p.cap}.`;
  if (p.cash !== null) return `${what} ready to ape.`;
  return "";
}

/** SOL turned into cash has landed: not a trade, so no moment, just the word (where the Turn key was, or as a toast when it landed later). */
export const cashInLine = (usdc: number): string => `Cash in: ${money(usdc)} ready to ape.`;

/** The key that turns SOL into cash: locked like a trade's while a swap may still land. */
export function turnKey(p: { pending: { landed: boolean; seconds: number } | null; busy: boolean; chosen: number | null }): { label: string; enabled: boolean } {
  if (p.pending) return { label: p.pending.landed ? "Updating your bag…" : `Checking… ${p.pending.seconds}s left`, enabled: false };
  if (p.busy) return { label: "Turning…", enabled: false };
  return { label: `Turn ${usd(p.chosen)} of SOL into cash`, enabled: p.chosen !== null };
}

/**
 * The line at the top of Add cash: what the wallet has, said as what it has
 * ("$0.00" first read as money gone); nothing when it has nothing.
 */
export function cashLede(cash: number | null, solUsd: number | null): string | null {
  const hasCash = cash !== null && cash >= 0.01;
  const hasSol = solUsd !== null && solUsd >= 1;
  if (hasCash && hasSol) return `You have ${money(cash)} in cash and about ${usd(solUsd)} in SOL.`;
  if (hasCash) return `You have ${money(cash)} in cash.`;
  return hasSol ? `You have about ${usd(solUsd)} in SOL.` : null;
}

/** The swap that covers an ape: the smallest choice that does, or the most there is. */
export function coverWith(choices: number[], need: number | null, cash: number | null): number | null {
  if (!choices.length) return null;
  if (need === null || cash === null) return choices[0]!;
  const short = need - cash;
  return choices.find((c) => c >= short) ?? choices[choices.length - 1]!;
}

/**
 * ME'S PROOF, the number first: the scams kept out once there are any, else
 * the coins sniffed, so the screen never opens on a 0 that reads as failing.
 */


/** A bag with nothing in it to trade: under a dollar, all told. */
export const emptyBag = (totalUsd: number): boolean => !(totalUsd >= 1);

/* A coin's icon on IPFS, wherever it was linked from: ipfs://, a path
   gateway (…/ipfs/<cid>) or a subdomain gateway (<cid>.ipfs.<host>). */
const IPFS_SCHEME = /^ipfs:\/\/(?:ipfs\/)?([A-Za-z0-9]+)(\/[^?#]*)?/;
const IPFS_SUBDOMAIN = /^https?:\/\/([a-z0-9]+)\.ipfs\.[^/?#]+(\/[^?#]*)?/;
const IPFS_PATH = /^https?:\/\/[^/?#]+\/ipfs\/([A-Za-z0-9]+)(\/[^?#]*)?/;

/** Gateways that answer for anyone, the one that held up best first. */
const GATEWAYS = ["https://4everland.io", "https://gateway.pinata.cloud", "https://ipfs.io"];

/**
 * WHERE A COIN'S FACE CAN COME FROM, in the order to try. The public IPFS
 * gateways coins are minted with (nftstorage.link, ipfs.io) turn a phone
 * away when busy, and a blue chip then wears a letter like a fake. An IPFS
 * address is its content's fingerprint, so any gateway that answers shows
 * the same picture: the face is never wrong, only late. Anything else is
 * tried as given.
 */
export function faceSources(uri: string | null): string[] {
  if (!uri) return [];
  const m = uri.match(IPFS_SCHEME) ?? uri.match(IPFS_SUBDOMAIN) ?? uri.match(IPFS_PATH);
  if (!m) return [uri];
  const cid = m[1]!;
  const path = m[2] && m[2] !== "/" ? m[2] : "";
  const via = (g: string) => `${g}/ipfs/${cid}${path}`;
  const all = [via(GATEWAYS[0]!), /^https?:/.test(uri) ? uri : null, ...GATEWAYS.slice(1).map(via)];
  return all.filter((u, i): u is string => u !== null && all.indexOf(u) === i);
}
