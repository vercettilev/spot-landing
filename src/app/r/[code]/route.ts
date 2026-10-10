import { NextResponse } from "next/server";
import { parseCode } from "@/lib/referral";

/**
 * A SHARED LINK, usespot.fun/r/K7P2QXM: the home page with the code in the
 * query, where the form picks it up. A code that is not one still lands on the
 * page, just without a friend to credit.
 */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = parseCode((await params).code);
  const to = new URL("/", req.url);
  if (code) to.searchParams.set("r", code);
  return NextResponse.redirect(to, 307);
}
