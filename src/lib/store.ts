import { get, head, list, put, BlobNotFoundError } from "@vercel/blob";
import { createHash } from "node:crypto";

/**
 * THE LIST, AS FILES in a private Vercel Blob store: one file per person,
 * named by the hash of their address.
 *
 *   - Deduplication for free: the same address computes the same pathname.
 *   - No lost writes: each signup touches only its own file, so two people in
 *     the same second cannot erase each other the way an appended list can.
 *   - No address in a filename: the index is hashes, and the store is private.
 *
 * Vercel connects the store through OIDC: it sets BLOB_STORE_ID, and the SDK
 * picks up the short-lived token Vercel attaches to each request. A
 * BLOB_READ_WRITE_TOKEN works as well.
 */
export const PREFIX = "signups/";

export function pathFor(email: string): string {
  return `${PREFIX}${createHash("sha256").update(email).digest("hex")}.json`;
}

export type SignupRecord = {
  email: string;
  platform: string;
  created_at: string;
  source: string;
  /** Their referral code, when the line was up to give one (line.ts). */
  code?: string;
  /** The code of the link that brought them, if one did. */
  referred_by?: string;
  updated_at?: string;
};

/** The phone on a record when the page could not tell it and nobody has picked one yet. */
export const UNKNOWN_PLATFORM = "unknown";

export type RecordResult =
  | { stored: true; isNew: boolean }
  /** The store could not take it. The caller falls back to mailing ourselves. */
  | { stored: false; reason: string };

async function readRecord(pathname: string): Promise<SignupRecord | null> {
  try {
    const res = await get(pathname, { access: "private", useCache: false });
    if (!res) return null;
    const record = JSON.parse(await new Response(res.stream).text());
    return record && typeof record.email === "string" ? (record as SignupRecord) : null;
  } catch {
    return null;
  }
}

/* Who a preview deployment has seen, so pressing twice still reads as "already in". */
const previewSeen = new Set<string>();

export async function recordSignup(
  email: string,
  platform: string | null,
  line: { code?: string; referredBy?: string } = {},
): Promise<RecordResult> {
  const pathname = pathFor(email);

  /* A PREVIEW DEPLOYMENT KEEPS NO ADDRESSES. It runs the form for real
     (BotID, the limiter, the pass) and answers as the store would, but writes
     nothing, so trying a preview never puts anyone on the live list. The
     site itself runs with VERCEL_ENV "production". */
  if (process.env.VERCEL_ENV === "preview") {
    const isNew = !previewSeen.has(pathname);
    previewSeen.add(pathname);
    return { stored: true, isNew };
  }

  /* Asked before writing so the notice can say "someone new". Not atomic with
     the write, and harmless: a race writes the same pathname twice. Anything
     but "not found" means the store did not answer, and calling that new
     would be guessing. */
  let isNew = true;
  try {
    await head(pathname);
    isNew = false;
  } catch (err) {
    if (!(err instanceof BlobNotFoundError)) {
      return { stored: false, reason: err instanceof Error ? err.message : String(err) };
    }
  }

  const now = new Date().toISOString();
  let record: SignupRecord;
  if (isNew) {
    record = { email, platform: platform ?? UNKNOWN_PLATFORM, created_at: now, source: "landing" };
    if (line.code) record.code = line.code;
    if (line.referredBy) record.referred_by = line.referredBy;
  } else {
    /* A REPEAT KEEPS ITS HISTORY: when they first came and whose link brought
       them stay; the phone changes if they named another (a visit that could
       not tell keeps the one on file), and a code arrives if the first visit
       came while the line was down. A record that cannot be read is left as
       it is rather than overwritten blind. */
    const before = await readRecord(pathname);
    if (!before) return { stored: true, isNew: false };
    const code = before.code ?? line.code;
    const phone = platform ?? before.platform;
    if (before.platform === phone && before.code === code) return { stored: true, isNew: false };
    record = { ...before, platform: phone, updated_at: now };
    if (code) record.code = code;
  }
  try {
    await put(pathname, JSON.stringify(record, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,  // the pathname IS the dedupe key
      allowOverwrite: true,    // a repeat lands on itself
    });
  } catch (err) {
    return { stored: false, reason: err instanceof Error ? err.message : String(err) };
  }
  return { stored: true, isNew };
}

/**
 * EVERY RECORD, in arrival order: the export script's and the invites' read
 * of the whole list. One operation per person (addresses are inside the
 * files, not in their names), so it is for an owner's tools, never a page.
 */
export async function allSignups(): Promise<SignupRecord[]> {
  const paths: string[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    paths.push(...page.blobs.map((b) => b.pathname));
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  /* Sixteen reads at a time: one by one, a list of thousands would outlast
     the minute a function gets. */
  const rows: SignupRecord[] = [];
  for (let i = 0; i < paths.length; i += 16) {
    const chunk = paths.slice(i, i + 16);
    (await Promise.all(chunk.map(readRecord))).forEach((record, j) => {
      if (record) rows.push(record);
      else console.error(`unreadable: ${chunk[j]}`);
    });
  }
  return rows.sort((a, b) => a.created_at.localeCompare(b.created_at));
}
