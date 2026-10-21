import { curatedByMint, type CuratedAsset } from "@/core/catalog/index";
import { SOL_MINT } from "@/core/route/jupiter";
import { num } from "./http";
import type { TokenInfo } from "./jupiter";

/** What the app needs to draw a coin before anyone has decided anything. */
export interface TokenCard {
  mint: string;
  /** Without a leading "$": dogwifhat's on-chain symbol is literally "$WIF". */
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
  /** For an issued asset (a tokenized stock, a bridged coin): who issued it. */
  issuer: string | null;
  /**
   * Who the issuer says may not hold it ("us-persons" for every tokenized
   * stock). Returned, not applied: the app knows its user's region, and a
   * response that differed by country could not be cached.
   */
  restrictions: string[];
}

/**
 * An asset someone issued on purpose, with authorities they keep on
 * purpose: a tokenized stock can be frozen by its issuer, and spot-core's
 * catalog records who that issuer is. Hand-probed memecoins in the same
 * catalog ("native-spl") get no such pass.
 */
export function issuedAsset(mint: string): CuratedAsset | undefined {
  const c = curatedByMint(mint);
  return c && c.issuer !== "native-spl" ? c : undefined;
}

const orNull = (v: unknown): number | null => num(v) ?? null;

export function cardOf(t: TokenInfo): TokenCard {
  const curated = curatedByMint(t.id);
  const issued = issuedAsset(t.id);
  /* SOL's mint is Jupiter's "Wrapped SOL", the token account SOL rides in
     through a swap. To anyone holding it, it is Solana. */
  const sol = t.id === SOL_MINT;
  return {
    mint: t.id,
    symbol: sol ? "SOL" : (t.symbol ?? "").replace(/^\$/, "").trim(),
    name: sol ? "Solana" : (t.name ?? "").trim(),
    icon: t.icon || null,
    decimals: t.decimals,
    kind: curated?.category === "equity" ? "stock" : curated?.category === "commodity" ? "commodity" : "coin",
    priceUsd: orNull(t.usdPrice),
    mcapUsd: orNull(t.mcap),
    liquidityUsd: orNull(t.liquidity),
    holders: orNull(t.holderCount),
    change24hPct: orNull(t.stats24h?.priceChange),
    verified: t.isVerified === true,
    issuer: issued?.issuer ?? null,
    restrictions: [...(curated?.issuerRestrictions ?? [])],
  };
}
