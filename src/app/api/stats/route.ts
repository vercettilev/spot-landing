import { fail, json } from "@/engine/api";
import { tallies } from "@/engine/tally";
import { getKv } from "@/lib/line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * HOW MUCH SPOT IS USED: `?days=14`, with the key in `SPOT_STATS_KEY` as
 * `?key=` or an `x-spot-key` header. Counts only, no one in them (see
 * engine/tally.ts).
 *
 *   200 { ok, days: [{ day, resolve, sniff, order, landed, bag, wallets }] }
 *   401 no_key   404 (unset key)   503 no_database
 */
export async function GET(req: Request) {
  const expected = process.env.SPOT_STATS_KEY?.trim();
  if (!expected) return fail(404, "not_found");
  const url = new URL(req.url);
  const given = url.searchParams.get("key") ?? req.headers.get("x-spot-key") ?? "";
  if (given !== expected) return fail(401, "no_key");
  const kv = getKv();
  if (!kv) return fail(503, "no_database");
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 14));
  return json({ ok: true, days: await tallies(days, kv) });
}
