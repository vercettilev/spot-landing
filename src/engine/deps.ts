import { thresholdsFromEnv } from "@/core/safety/open-mint-gate";
import { PUBLIC_RPC, makeMintReader } from "./chain";
import { makePairLookup } from "./dexscreener";
import { jupiterConfig, makePacer, makeQuoter, makeSearch } from "./jupiter";
import { makeExpander, makePostReader } from "./posts";
import type { ResolveDeps } from "./resolve";
import { DEFAULT_POLICY, type Policy, type SniffDeps } from "./sniff";

export type Deps = ResolveDeps & SniffDeps & { policy: Policy };

/** The cap for warned coins, from the environment; a typo keeps the default. */
function warnCap(raw: string | undefined): number {
  const n = Number(raw);
  return raw && raw.trim() !== "" && Number.isFinite(n) && n > 0 ? n : DEFAULT_POLICY.warnCapUsdc;
}

export function depsFromEnv(env: Record<string, string | undefined> = process.env): Deps {
  const jup = jupiterConfig(env);
  const pace = makePacer(jup.rps);
  return {
    search: makeSearch(jup, { pace }),
    quote: makeQuoter(jup, { pace }),
    readMint: makeMintReader(env.SOLANA_RPC_URL?.trim() || PUBLIC_RPC),
    readPost: makePostReader(),
    expand: makeExpander(),
    pairs: makePairLookup(),
    policy: {
      ...DEFAULT_POLICY,
      thresholds: { ...DEFAULT_POLICY.thresholds, ...thresholdsFromEnv(env) },
      warnCapUsdc: warnCap(env.SPOT_WARN_CAP_USDC),
    },
  };
}

/* One set per instance, built on first use. Specs swap in fakes. */
let current: Deps | null = null;

export function getDeps(): Deps {
  current ??= depsFromEnv();
  return current;
}

export function setDeps(deps: Deps | null): void {
  current = deps;
}
