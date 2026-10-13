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
export function verdictLine(sniff: Pick<Sniff, "level" | "checks" | "token">): string {
  switch (sniff.level) {
    case "ok":
      return sniff.token.kind === "stock"
        ? "A stock coin: the issuer holds the keys, as it should. You can sell it back anytime."
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
