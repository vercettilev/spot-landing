import { describe, expect, it, vi } from "vitest";
import { inviteState, unsubscribeToken } from "@/lib/invite";
import { personFor } from "@/lib/line";
import { memoryKv } from "@/lib/memoryKv";

/**
 * One-click unsubscribe, as a mail app does it: a post to the address in the
 * header takes that person off, and only with their own secret. Opened in a
 * browser, the address hands over to the page that asks first.
 */
const line = vi.hoisted(() => ({ kv: null as unknown }));
vi.mock("@/lib/line", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/line")>()),
  getKv: () => line.kv,
}));

import { GET, POST } from "./route";

describe("one-click unsubscribe", () => {
  it("takes the person off with their own secret, and nobody with a wrong one", async () => {
    const kv = memoryKv();
    line.kv = kv;
    const p = personFor("a@x.com");
    const t = await unsubscribeToken(kv, p);
    const post = (token: string) =>
      POST(new Request(`https://www.usespot.fun/api/unsubscribe?p=${p}&t=${token}`, { method: "POST", body: "List-Unsubscribe=One-Click" }));

    expect((await post("0".repeat(32))).status).toBe(400);
    expect((await inviteState(kv)).unsubscribed.size).toBe(0);
    expect((await post(t)).status).toBe(200);
    expect((await inviteState(kv)).unsubscribed.has(p)).toBe(true);
  });

  it("sends a browser to the page that asks first", async () => {
    const res = await GET(new Request("https://www.usespot.fun/api/unsubscribe?p=abc&t=def"));
    expect(res.status).toBe(303);
    expect(res.headers.get("location")).toBe("https://www.usespot.fun/unsubscribe?p=abc&t=def");
  });
});
