/* What the API answers, as src/engine in the site defines it (token.ts,
   resolve.ts, sniff.ts). Copied, not imported: the app is its own bundle.
   Change both together. */

export interface TokenCard {
  mint: string;
  symbol: string;
  name: string;
  icon: string | null;
  decimals: number;
  kind: "coin" | "stock" | "commodity";
  priceUsd: number | null;
  mcapUsd: number | null;
  liquidityUsd: number | null;
  holders: number | null;
  change24hPct: number | null;
  verified: boolean;
  issuer: string | null;
  restrictions: string[];
}

export type Via = "link" | "post" | "text" | "pair" | "cashtag" | "name";

export interface Candidate {
  token: TokenCard;
  via: Via;
}

export type Platform = "x" | "tiktok" | "youtube" | "telegram" | "reddit" | "instagram" | "web" | "text";

export interface Source {
  platform: Platform;
  url: string | null;
  author: string | null;
  text: string | null;
}

export interface ResolveResult {
  ok: true;
  status: "found" | "ambiguous" | "none";
  pick: Candidate | null;
  candidates: Candidate[];
  source: Source;
  missed: string[];
}

export type Status = "good" | "info" | "warn" | "bad" | "unknown";
export type Level = "ok" | "warn" | "block" | "unknown";
export type CheckId =
  | "route"
  | "honeypot"
  | "freeze"
  | "delegate"
  | "mint"
  | "tax"
  | "hook"
  | "liquidity"
  | "holders"
  | "age"
  | "flagged";

export interface Check {
  id: CheckId;
  label: string;
  answer: string;
  status: Status;
  blocks: boolean;
  note: string | null;
  observed: string | number | boolean | null;
  threshold: string | number | null;
}

export interface Sniff {
  ok: true;
  mint: string;
  level: Level;
  headline: string;
  token: TokenCard;
  checks: Check[];
  maxBuyUsdc: number | null;
  roundTrip: { inUsdc: number; outUsdc: number; lossPct: number } | null;
  checkedAt: string;
}

/** What came through the share sheet, or a paste, on its way to /api/resolve. */
export interface Share {
  url?: string;
  text?: string;
  /** How it arrived, for the line under the coin. */
  from: "share" | "paste";
}
