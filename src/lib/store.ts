import { head, put, BlobNotFoundError } from "@vercel/blob";
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
 * Needs BLOB_READ_WRITE_TOKEN, which Vercel sets once a Blob store is
 * connected to the project.
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
};

export type RecordResult =
  | { stored: true; isNew: boolean }
  /** The store could not take it. The caller falls back to mailing ourselves. */
  | { stored: false; reason: string };

export async function recordSignup(email: string, platform: string): Promise<RecordResult> {
  const pathname = pathFor(email);

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

  const record: SignupRecord = { email, platform, created_at: new Date().toISOString(), source: "landing" };
  try {
    await put(pathname, JSON.stringify(record, null, 2), {
      access: "private",
      contentType: "application/json",
      addRandomSuffix: false,  // the pathname IS the dedupe key
      allowOverwrite: true,    // a repeat lands on itself, and updates the phone if it changed
    });
  } catch (err) {
    return { stored: false, reason: err instanceof Error ? err.message : String(err) };
  }
  return { stored: true, isNew };
}
