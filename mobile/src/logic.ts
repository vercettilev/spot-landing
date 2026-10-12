import type { Check, CheckId, Level, Platform, Share, Source, Via } from "./types";

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

const SUB = "₀₁₂₃₄₅₆₇₈₉";

/** Sizes in dollars the way CT reads them: $220.0M, $6.6M, $4.2k, $900. */
export function usd(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}k`;
  return `$${Math.round(Math.max(n, 0))}`;
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
  return share.from === "paste" ? "from your paste" : "from your share";
}

const VIA: Record<Via, string> = {
  link: "the link's coin",
  post: "named in the post",
  text: "CA in the share",
  pair: "the pool's coin",
  cashtag: "cashtag",
  name: "named in words",
};

export const viaLine = (via: Via) => VIA[via];

export interface Action {
  label: string;
  enabled: boolean;
  tone: "go" | "growl" | "stop" | "wait";
}

/**
 * The one button. No wallet yet, so "Ape" says what it would do and the
 * line under it says why it cannot today; a blocked coin never gets a
 * button that looks pressable.
 */
export function actionFor(state: "loading" | "error" | Level, amount: number): Action {
  switch (state) {
    case "loading":
      return { label: "Sniffing…", enabled: false, tone: "wait" };
    case "ok":
      return { label: `Ape ${amount} USDC`, enabled: true, tone: "go" };
    case "warn":
      return { label: `GRRR. Ape ${amount} USDC`, enabled: true, tone: "growl" };
    case "block":
      return { label: "Spot won't buy this", enabled: false, tone: "stop" };
    default:
      return { label: "Sniff again", enabled: true, tone: "wait" };
  }
}
