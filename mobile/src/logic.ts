import type { Check, CheckId, Level, Platform, Share, Sniff, Source } from "./types";

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

export function clampAmount(amount: number, cap: number | null): number {
  return cap === null ? amount : Math.min(amount, cap);
}

/**
 * THE MOMENT after a trade lands, in three lines: the word, the loud
 * figure, and the small one. A sell leads with what it made since the ape
 * when Spot knows; a loss is said plainly and without a sting.
 */
export interface MomentData {
  kind: "ape" | "sell" | "cash";
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
  if (m.kind === "cash") return { head: "Cash in.", big: `${money(m.usdc)} ready to ape`, small: "From SOL, in one tap.", backdrop: "orange" };
  const trade = `${coins} → ${money(m.usdc)}`;
  if (!m.gain) return { head: "Sold.", big: trade, small: "Cash is back in your bag.", backdrop: "orange" };
  const figure = m.gain.pct === null ? signed(m.gain.usd) : `${signed(m.gain.usd)} (${pct(m.gain.pct)})`;
  return m.gain.usd >= 0
    ? { head: "Sold.", big: figure, small: `since you aped · ${trade}`, backdrop: "green" }
    : { head: "Sold.", big: figure, small: `It happens. ${trade}`, backdrop: "orange" };
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
  if (m.kind === "cash") return { figure: "Cash in.", line: `${money(m.usdc)} ready to ape`, foot: "", tint: "orange" };
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

/** The landing's four questions first, in its order, then what else the sniff found. */
const ORDER: CheckId[] = ["route", "honeypot", "freeze", "mint", "holders", "delegate", "liquidity", "age", "tax", "hook", "flagged"];

export function ordered(checks: Check[]): Check[] {
  return [...checks].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
}

/* Why a coin growls, a few words a check. */
const WHY: Partial<Record<CheckId, string>> = {
  honeypot: "you'd lose some selling it back",
  mint: "the dev can print more",
  liquidity: "a small pool",
  holders: "few holders",
  age: "brand new",
  tax: "a tax on trades",
  hook: "code that could block sells",
  flagged: "flagged as sus",
};

/* What a blocked coin would have done to the money, which is why Spot won't buy it. */
const STUCK: Partial<Record<CheckId, string>> = {
  route: "There's no way to buy it right now.",
  honeypot: "You could buy it, but you'd never get out.",
  freeze: "The dev could lock your coins the second you buy.",
  delegate: "The dev could pull your coins right out of your wallet.",
  tax: "Most of every buy and sell would go to the tax.",
};

/**
 * The line under the verdict on the receipt: what it means for the bag, in
 * one sentence, so the questions below are proof rather than homework.
 */
export function verdictLine(sniff: Pick<Sniff, "level" | "checks" | "token"> & { roundTrip?: Sniff["roundTrip"] }): string {
  switch (sniff.level) {
    case "ok":
      return sniff.token.kind === "stock"
        ? "A stock coin: the issuer holds the keys, as it should. You can sell it back anytime."
        : sniff.roundTrip === null
          ? "Big, old and verified. You can sell it back anytime."
          : "No rug tricks found. You can sell it back anytime.";
    case "warn": {
      const why = ordered(sniff.checks)
        .filter((c) => c.status === "warn")
        .map((c) => WHY[c.id])
        .filter((w): w is string => Boolean(w));
      if (!why.length) return "Some checks didn't answer, so Spot keeps your buy small.";
      const list = why.length === 1 ? why[0]! : `${why.slice(0, -1).join(", ")} and ${why[why.length - 1]}`;
      return `${list[0]!.toUpperCase()}${list.slice(1)}.`;
    }
    case "block": {
      const blocker = sniff.checks.find((c) => c.blocks && c.status === "bad");
      return (blocker && STUCK[blocker.id]) ?? blocker?.note ?? "This coin can take your bag.";
    }
    default:
      return "Some checks didn't answer. Sniff again in a moment.";
  }
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
  return share.from === "paste" ? "from your paste" : share.from === "screenshot" ? "from your screenshot" : "from your share";
}

export interface Action {
  label: string;
  enabled: boolean;
  tone: "go" | "buy" | "sell" | "growl" | "stop" | "wait";
}

/**
 * The one button, in dollars (USDC is a dollar): "Ape $25". A blocked coin
 * never gets a button that looks pressable.
 */
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
      return { label: "Sniff again", enabled: true, tone: "wait" };
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

/* expo-share-intent hands a shared image over as a file:// URI, and the text
   reader on Android opens a content:// URI or a bare path, so the scheme
   comes off first. */
export function readablePath(uri: string, os: string): string {
  return os === "android" && uri.startsWith("file://") ? uri.slice("file://".length) : uri;
}

/** What tells same-named coins apart, under each in "which one?": its name, its size, its holders. */
export function candidateLine(t: { name: string; mcapUsd: number | null; holders: number | null }): string {
  const parts = [t.mcapUsd !== null ? `${usd(t.mcapUsd)} market cap` : null, t.holders !== null ? `${count(t.holders)} holders` : null].filter(Boolean);
  return parts.length ? `${t.name}. ${parts.join(", ")}` : t.name;
}

/** The receipt's line under the stamp: the stamp already says GRRR, so the line doesn't say it twice. */
export function verdictHead(level: Level, headline: string): string {
  if (level !== "warn") return headline;
  return headline.replace(/^GRRR\.\s*/, "") || headline;
}

/* ---- the dock: the key, the line under it, and the amount being typed ---- */

/** The most one trade can be, on the server ($1 to $10,000). */
export const MAX_TRADE = 10_000;

/** Dollars the way a button says them: cents under $10 ($0.42), round past that ($15, $1.2k). */
export const approx = (n: number): string => `~${n < 10 ? money(n) : usd(n)}`;

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
  /** The SOL in the wallet could become enough cash. */
  solCovers: boolean;
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

/** Spot apes in dollars: short of them, the one thing to do is add cash. */
export const needsCash = (s: DockState): boolean =>
  s.side === "buy" && canSize(s) && s.wallet === "mwa" && s.cash !== null && s.cash < s.amount;

/**
 * THE KEY. In order: a trade that may still land locks it, whatever else
 * is true; an empty keypad waits for a number; a sell says what it sells for; a buy is refused to the US on a
 * coin that isn't sold there, waits while it is sent, asks for cash when
 * short, and otherwise says what the sniff allows.
 */
export function dockKey(s: DockState): Action {
  if (s.checking) return { label: s.checking.landed ? "Updating your bag…" : `Checking… ${s.checking.seconds}s`, enabled: false, tone: "wait" };
  if (s.empty) return { label: "Type an amount", enabled: false, tone: "stop" };
  if (s.side === "sell") {
    if (s.busy) return { label: "Selling…", enabled: false, tone: "wait" };
    if (s.held === null) return { label: "Counting your bag…", enabled: false, tone: "wait" };
    return { label: `Sell ${shareWord(s.sellPct)} for ${approx((s.held * s.sellPct) / 100)}`, enabled: true, tone: "sell" };
  }
  if (s.restricted) return { label: "Not for US users", enabled: false, tone: "stop" };
  if (s.busy) return { label: "Aping…", enabled: false, tone: "wait" };
  if (needsCash(s)) return { label: "Add cash", enabled: true, tone: "go" };
  return actionFor(s.sniff, s.amount);
}

/** The line under the key: what happens next, or what to do instead. */
export function dockNote(s: DockState): string {
  if (s.checking) return s.checking.landed ? "Done. Your bag catches up in a sec." : "Making sure it landed. You can leave, Spot will tell you.";
  if (s.side === "sell") return s.wallet === "mwa" ? "Sells into USDC. Your wallet approves every trade." : "You're only tracking this wallet. Connect yours to sell.";
  if (s.sniff === "loading") return "Checking it for scams…";
  if (s.sniff === "block") return "Share another post to sniff something else.";
  if (s.restricted) return "Coins like this aren't sold to people in the US.";
  if (needsCash(s)) return `Only ${money(s.cash)} in USDC. ${s.solCovers ? "Turn some SOL into cash first." : "Add cash, then ape."}`;
  if (s.wallet === "mwa") return s.cash === null ? "Your wallet approves every trade." : `${money(s.cash)} ready to ape. Your wallet approves every trade.`;
  if (s.wallet === "watch") return "You're only tracking this wallet. Connect yours to ape.";
  return "Free sniff. Connect a wallet to ape.";
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

/** The most a buy can be: the cap on a coin that growls, the server's limit, and the cash when it is read. Null when there is no sensible most to offer. */
export function maxApe(cash: number | null, cap: number | null): number | null {
  const limit = Math.min(cap ?? MAX_TRADE, MAX_TRADE);
  if (cash !== null && cash >= 1) return Math.floor(Math.min(cash, limit));
  return cap !== null && cap >= 1 ? Math.floor(limit) : null;
}

/** The line under the amount being typed. `over` when the last digit was refused. */
export function padHint(p: { side: "buy" | "sell"; typed: number | null; over: boolean; cap: number | null; cash: number | null; held: number | null }): string {
  if (p.side === "sell") {
    if (p.held === null) return "";
    if (p.typed !== null && !p.over) return `${shareWord(shareFor(p.typed, p.held))} of your ${money(p.held)}.`.replace(/^all of/, "All of");
    return `You hold ${money(p.held)}.`;
  }
  if (p.over) return p.cap !== null ? `Spot caps this one at $${p.cap}.` : `Up to $${MAX_TRADE.toLocaleString("en-US")} a trade.`;
  if (p.cash !== null && p.typed !== null && p.typed > p.cash) return `More than your ${money(p.cash)}. Add cash first.`;
  if (p.cap !== null) return `Spot caps this one at $${p.cap}.`;
  if (p.cash !== null) return `${money(p.cash)} ready to ape.`;
  return "";
}

/** What the wallet holds of a coin, over the dock. */
export const holding = (usdHeld: number): string => `You hold ${money(usdHeld)}`;

/** The key that turns SOL into cash: locked like a trade's while a swap may still land. */
export function turnKey(p: { pending: { landed: boolean; seconds: number } | null; busy: boolean; chosen: number | null }): { label: string; enabled: boolean } {
  if (p.pending) return { label: p.pending.landed ? "Updating your bag…" : `Checking… ${p.pending.seconds}s`, enabled: false };
  if (p.busy) return { label: "Turning…", enabled: false };
  return { label: `Turn ${usd(p.chosen)} into cash`, enabled: p.chosen !== null };
}

/** The line at the top of Add cash: what there is now, when it is short of an ape. */
export function cashLede(need: number | null, cash: number | null): string {
  const base = "Spot apes in dollars: USDC on Solana. It goes to your own wallet, not to Spot.";
  return need !== null && cash !== null && cash < need ? `You have ${money(cash)} in USDC. ${base}` : base;
}

/** The swap that covers an ape: the smallest choice that does, or the most there is. */
export function coverWith(choices: number[], need: number | null, cash: number | null): number | null {
  if (!choices.length) return null;
  if (need === null || cash === null) return choices[0]!;
  const short = need - cash;
  return choices.find((c) => c >= short) ?? choices[choices.length - 1]!;
}

/** Under the bag's worth: what it is made of, and what is ready to ape. */
export function bagLine(coins: number, cashUsd: number): string {
  const held = coins === 0 ? "No coins yet" : `${coins} coin${coins === 1 ? "" : "s"}`;
  return `${held} and ${usd(cashUsd)} ready to ape`;
}

/** A bag with nothing in it to trade: under a dollar, all told. */
export const emptyBag = (totalUsd: number): boolean => !(totalUsd >= 1);
