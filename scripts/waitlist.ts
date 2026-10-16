/**
 * Who asked for Spot, and on which phone.
 *
 *   npm run waitlist           # counts per phone
 *   npm run waitlist -- --csv  # the list in line order, for a spreadsheet
 *
 * Reads the private Blob store, so it needs the store's credentials in
 * .env.local: BLOB_STORE_ID and a VERCEL_OIDC_TOKEN, which `vercel env pull`
 * writes once the store is connected to the Development environment, or a
 * BLOB_READ_WRITE_TOKEN. Addresses are inside the files, not in their names,
 * so the CSV opens every file: one operation per person, which is why this is
 * a script and not something the site does.
 *
 * The order is the line's (line.ts) when Redis is reachable from here too
 * (KV_REST_API_URL and KV_REST_API_TOKEN in .env.local), else arrival order.
 * Invite people in this order: it is the one the page showed them.
 */
import { readFileSync, existsSync } from "node:fs";
import { allSignups, type SignupRecord } from "../src/lib/store";
import { getKv, lineOrder } from "../src/lib/line";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
const usable = (v: string | undefined) => Boolean(v && !v.includes("SENSITIVE"));
const env = process.env;
if (!usable(env.BLOB_READ_WRITE_TOKEN) && !(usable(env.BLOB_STORE_ID) && usable(env.VERCEL_OIDC_TOKEN))) {
  console.error(
    "No Blob credentials in .env.local. Connect the Blob store to the Development environment, then run: vercel env pull",
  );
  process.exit(1);
}

async function main() {
  const rows = await allSignups();

  /* The line's order where it has one; anyone it does not know (signed up
     while it was down) follows in arrival order. */
  const kv = getKv();
  const place = new Map<string, number>();
  if (kv) (await lineOrder(kv)).forEach((code, i) => place.set(code, i + 1));
  const at = (r: SignupRecord) => (r.code && place.get(r.code)) || Number.MAX_SAFE_INTEGER;
  rows.sort((a, b) => at(a) - at(b));
  const brought = new Map<string, number>();
  for (const r of rows) if (r.referred_by) brought.set(r.referred_by, (brought.get(r.referred_by) ?? 0) + 1);

  if (process.argv.includes("--csv")) {
    console.log("place,email,platform,created_at,code,referred_by,friends_brought");
    for (const r of rows) {
      const p = r.code ? place.get(r.code) ?? "" : "";
      console.log([p, r.email, r.platform, r.created_at, r.code ?? "", r.referred_by ?? "", r.code ? brought.get(r.code) ?? 0 : 0].join(","));
    }
    return;
  }
  const by = new Map<string, number>();
  for (const r of rows) by.set(r.platform, (by.get(r.platform) ?? 0) + 1);
  console.log(`${rows.length} on the list${kv ? "" : " (no line here: KV_REST_API_URL is not set, so no places)"}`);
  for (const [k, v] of [...by.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(8)} ${v}`);
  const viaFriend = rows.filter((r) => r.referred_by).length;
  if (viaFriend) console.log(`  ${viaFriend} came through a friend's link`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
