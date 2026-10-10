/**
 * Who asked for Spot, and on which phone.
 *
 *   npm run waitlist           # counts per phone
 *   npm run waitlist -- --csv  # email,platform,created_at for a spreadsheet
 *
 * Reads the private Blob store, so it needs BLOB_READ_WRITE_TOKEN in
 * .env.local (`vercel env pull` writes it there). Addresses are inside the
 * files, not in their names, so the CSV opens every file: one operation per
 * person, which is why this is a script and not something the site does.
 */
import { readFileSync, existsSync } from "node:fs";
import { get, list } from "@vercel/blob";
import { PREFIX, type SignupRecord } from "../src/lib/store";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
if (!process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_READ_WRITE_TOKEN.includes("SENSITIVE")) {
  console.error("BLOB_READ_WRITE_TOKEN is missing or a placeholder. Run: vercel env pull");
  process.exit(1);
}

async function main() {
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    paths.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);

  const rows: SignupRecord[] = [];
  for (const pathname of paths) {
    const res = await get(pathname, { access: "private" });
    if (!res) continue; // deleted between list and get
    try {
      rows.push(JSON.parse(await new Response(res.stream).text()) as SignupRecord);
    } catch {
      console.error(`unreadable: ${pathname}`);
    }
  }
  rows.sort((a, b) => a.created_at.localeCompare(b.created_at));

  if (process.argv.includes("--csv")) {
    console.log("email,platform,created_at");
    for (const r of rows) console.log(`${r.email},${r.platform},${r.created_at}`);
    return;
  }
  const by = new Map<string, number>();
  for (const r of rows) by.set(r.platform, (by.get(r.platform) ?? 0) + 1);
  console.log(`${rows.length} on the list`);
  for (const [k, v] of [...by.entries()].sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(8)} ${v}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
