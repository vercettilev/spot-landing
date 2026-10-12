import { json } from "@/engine/api";
import { jupiterConfig } from "@/engine/jupiter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which upstreams this deployment is pointed at. Says whether a key is set, never what it is. */
export function GET() {
  const env = process.env;
  const jup = jupiterConfig(env);
  return json({
    ok: true,
    jupiter: { host: new URL(jup.base).host, quote: jup.quotePath, key: Boolean(jup.apiKey) },
    rpc: env.SOLANA_RPC_URL?.trim() ? "custom" : "public",
    commit: env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
