import type { UltraSearchClient } from "@/core/resolve/ultra";
import { SOL_MINT, USDC_MINT } from "@/core/route/jupiter";
import type { AccountsReader } from "./chain";
import { num, type Outcome } from "./http";
import type { TokenInfo } from "./jupiter";
import { cardOf, type TokenCard } from "./token";

/**
 * THE BAG: what a wallet holds and what it is worth, for the app's Bag tab.
 * Balances come from the chain, prices and faces from Jupiter, in one
 * search for every mint at once. Whatever Jupiter cannot price, and what is
 * worth less than a cent (airdropped spam, dust), is counted, not listed.
 */

export interface Holding {
  token: TokenCard;
  amount: number;
  /** Raw base units, what a sell of the whole bag asks for. */
  raw: string;
  usd: number;
}

export interface Holdings {
  owner: string;
  totalUsd: number;
  usdc: { amount: number; raw: string; usd: number };
  /** SOL, with its card when Jupiter priced it, so the app can show it as the coin it is. */
  sol: { amount: number; usd: number | null; token?: TokenCard };
  /** Coins worth a cent or more, the biggest first. */
  positions: Holding[];
  /** Everything else: unpriced, spam, dust. */
  hidden: number;
}

export interface HoldingsDeps {
  search: UltraSearchClient;
  readAccounts: AccountsReader;
}

/* Ultra takes up to a hundred mints in one query; SOL takes one of them. */
const MAX_MINTS = 99;

const cents = (n: number) => Math.round(n * 100) / 100;

export async function holdings(owner: string, deps: HoldingsDeps): Promise<Outcome<Holdings, "lookup_failed">> {
  const acc = await deps.readAccounts(owner);
  if (!acc.ok) return { ok: false, reason: "lookup_failed" };

  const usdcRow = acc.value.tokens.find((t) => t.mint === USDC_MINT);
  /* Wrapped SOL is SOL: it is counted with it, not listed as a second Solana. */
  const wrapped = acc.value.tokens.find((t) => t.mint === SOL_MINT)?.amount ?? 0;
  const coins = acc.value.tokens.filter((t) => t.mint !== USDC_MINT && t.mint !== SOL_MINT && t.amount > 0);
  const asked = coins.slice(0, MAX_MINTS);

  const found = await deps.search.search([SOL_MINT, ...asked.map((t) => t.mint)].join(","), { timeoutMs: 3_000 });
  if (!found.ok) return { ok: false, reason: "lookup_failed" };
  const infos = new Map<string, TokenInfo>(found.value.map((t) => [t.id, t]));

  const positions: Holding[] = [];
  for (const t of asked) {
    const info = infos.get(t.mint);
    const price = num(info?.usdPrice);
    if (!info || price === undefined) continue;
    const usd = price * t.amount;
    if (usd < 0.01) continue;
    positions.push({ token: cardOf(info), amount: t.amount, raw: t.raw, usd: cents(usd) });
  }
  positions.sort((a, b) => b.usd - a.usd);

  const solInfo = infos.get(SOL_MINT);
  const solPrice = num(solInfo?.usdPrice);
  const solAmount = acc.value.sol + wrapped;
  const sol = {
    amount: solAmount,
    usd: solPrice === undefined ? null : cents(solAmount * solPrice),
    ...(solInfo && solPrice !== undefined ? { token: cardOf(solInfo) } : {}),
  };
  const usdc = { amount: usdcRow?.amount ?? 0, raw: usdcRow?.raw ?? "0", usd: cents(usdcRow?.amount ?? 0) };
  const totalUsd = cents(usdc.usd + (sol.usd ?? 0) + positions.reduce((sum, p) => sum + p.usd, 0));

  return {
    ok: true,
    value: { owner, totalUsd, usdc, sol, positions, hidden: coins.length - positions.length },
  };
}
