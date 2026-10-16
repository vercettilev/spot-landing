import { unsubscribe } from "@/lib/invite";
import { getKv } from "@/lib/line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ONE-CLICK UNSUBSCRIBE (RFC 8058), the address in every invite's
 * List-Unsubscribe header. A mail app posts here when someone presses its own
 * Unsubscribe; nobody sees the answer. A mail app that opens the address in a
 * browser instead gets the page that asks first.
 */
export async function POST(req: Request) {
  const url = new URL(req.url);
  const kv = getKv();
  const done = kv ? await unsubscribe(kv, url.searchParams.get("p") ?? "", url.searchParams.get("t") ?? "") : false;
  return new Response(done ? "Unsubscribed.\n" : "That link didn't work.\n", {
    status: done ? 200 : 400,
    headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const query = new URLSearchParams({ p: url.searchParams.get("p") ?? "", t: url.searchParams.get("t") ?? "" });
  return Response.redirect(new URL(`/unsubscribe?${query}`, url), 303);
}
