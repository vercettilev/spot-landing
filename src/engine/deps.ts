import { thresholdsFromEnv } from "@/core/safety/open-mint-gate";
import { PUBLIC_RPC, makeAccountsReader, makeImageReader, makeMintReader, makeSignatureReader, type ImageReader, type SignatureReader } from "./chain";
import { makePairLookup } from "./dexscreener";
import { jupiterConfig, makePacer, makeQuoter, makeSearch } from "./jupiter";
import type { HoldingsDeps } from "./holdings";
import { makeExpander, makePostReader } from "./posts";
import type { ResolveDeps } from "./resolve";
import { sniffSharing, type ShareSniff } from "./shared";
import { DEFAULT_POLICY, type Policy, type SniffDeps } from "./sniff";
import { makeExecutor, makeOrderer, tradeConfig, type Executor, type Orderer } from "./trade";
import { makeTrigger, type Trigger } from "./trigger";

export type Deps = ResolveDeps &
  SniffDeps &
  HoldingsDeps & { policy: Policy; order: Orderer; execute: Executor; trigger: Trigger; readSignature: SignatureReader; readImage: ImageReader; shareSniff: ShareSniff };

/** The cap for warned coins, from the environment; a typo keeps the default. */
function warnCap(raw: string | undefined): number {
  const n = Number(raw);
  return raw && raw.trim() !== "" && Number.isFinite(n) && n > 0 ? n : DEFAULT_POLICY.warnCapUsdc;
}

export function depsFromEnv(env: Record<string, string | undefined> = process.env): Deps {
  const jup = jupiterConfig(env);
  const trade = tradeConfig(jup, env);
  const pace = makePacer(jup.rps);
  const rpc = env.SOLANA_RPC_URL?.trim() || PUBLIC_RPC;
  return {
    search: makeSearch(jup, { pace }),
    quote: makeQuoter(jup, { pace }),
    readMint: makeMintReader(rpc),
    readAccounts: makeAccountsReader(rpc),
    order: makeOrderer(trade, { pace }),
    execute: makeExecutor(trade, { pace }),
    trigger: makeTrigger(jup, { pace }),
    readSignature: makeSignatureReader(rpc),
    readImage: makeImageReader(rpc),
    readPost: makePostReader(),
    expand: makeExpander(),
    pairs: makePairLookup(),
    shareSniff: sniffSharing(),
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
