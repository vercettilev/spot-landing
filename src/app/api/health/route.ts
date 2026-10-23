import { json } from "@/engine/api";
import { getDeps } from "@/engine/deps";
import { jupiterConfig } from "@/engine/jupiter";
import { tradingMode } from "@/engine/trade";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which upstreams this deployment is pointed at, whether trading is open (to everyone, or "testing": to listed wallets only), and the size a coin needs for CLEAN. Says whether a key is set, never what it is. */
export function GET() {
  const env = process.env;
  const jup = jupiterConfig(env);
  const floors = getDeps().policy.thresholds;
  return json({
    ok: true,
    jupiter: { host: new URL(jup.base).host, quote: jup.quotePath, key: Boolean(jup.apiKey), rps: jup.rps },
    clean: { liquidityUsd: floors.minLiquidityUsd, holders: floors.minHolderCount, poolAgeHours: floors.minPoolAgeMs / 3_600_000 },
    rpc: env.SOLANA_RPC_URL?.trim() ? "custom" : "public",
    trading: tradingMode(env).mode,
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
