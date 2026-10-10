import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { join, personFor, spotOf, type Kv } from "@/lib/line";
import { memoryKv } from "@/lib/memoryKv";

/**
 * The door to the list: what gets stored, what is refused, and what happens
 * when the store does not answer. Each case is checked against the store and
 * mail mocks, because a wrong answer here is either a lost address or junk on
 * the list that decides which phone gets the first build. The line (places
 * and referrals) runs on an in-memory Redis, or not at all.
 */
const checkBotId = vi.fn();
vi.mock("botid/server", () => ({ checkBotId: () => checkBotId() }));

const blob = vi.hoisted(() => {
  class BlobNotFoundError extends Error {}
  return { head: vi.fn(), put: vi.fn(), get: vi.fn(), BlobNotFoundError };
});
vi.mock("@vercel/blob", () => ({ head: blob.head, put: blob.put, get: blob.get, BlobNotFoundError: blob.BlobNotFoundError }));

const line = vi.hoisted(() => ({ kv: null as unknown }));
vi.mock("@/lib/line", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/line")>()),
  getKv: () => line.kv,
}));

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

let ip = 0;
const ask = (body: unknown, from = `10.0.0.${++ip}`) =>
  new Request("https://example.com/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": from },
    body: JSON.stringify(body),
  });
const lookup = (code: string) =>
  new Request(`https://example.com/api/waitlist?code=${code}`, { headers: { "x-real-ip": `10.1.0.${++ip}` } });
const hash = (email: string) => createHash("sha256").update(email).digest("hex");
const stored = (call = 0) => JSON.parse(blob.put.mock.calls[call]![1]);
const blobOf = (record: unknown) => ({ stream: new Response(JSON.stringify(record)).body });

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.MAIL_FROM = "Spot <hello@example.com>";
  process.env.OPS_INBOX = "ops@example.com";
  for (const m of [checkBotId, blob.head, blob.put, blob.get, send]) m.mockReset();
  checkBotId.mockResolvedValue({ isBot: false });
  blob.head.mockRejectedValue(new blob.BlobNotFoundError("not found"));
  blob.put.mockResolvedValue({ pathname: "x" });
  send.mockResolvedValue({ data: { id: "m1" }, error: null });
  line.kv = null;
});

describe("POST /api/waitlist", () => {
  it("stores a new address with the phone it picked, then tells us", async () => {
    const { POST } = await import("./route");
    const res = await POST(ask({ email: " Reader@Example.com ", platform: "Android", website: "" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, already_registered: false, spot: null });

    const [pathname, , options] = blob.put.mock.calls[0]!;
    expect(pathname).toBe(`signups/${hash("reader@example.com")}.json`);
    expect(stored()).toMatchObject({ email: "reader@example.com", platform: "android", source: "landing" });
    expect(stored()).not.toHaveProperty("code");
    expect(options).toMatchObject({ access: "private", addRandomSuffix: false, allowOverwrite: true });
    expect(send.mock.calls[0]![0].subject).toBe("New Spot signup: reader@example.com (android)");
  });

  it("answers a repeat without a second notice, keeping when they first came", async () => {
    blob.head.mockResolvedValue({ pathname: "x" });
    blob.get.mockResolvedValue(
      blobOf({ email: "reader@example.com", platform: "iphone", created_at: "2026-10-01T00:00:00.000Z", source: "landing" }),
    );
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "seeker" }));
    expect(await res.json()).toEqual({ success: true, already_registered: true, spot: null });
    expect(stored()).toMatchObject({ platform: "seeker", created_at: "2026-10-01T00:00:00.000Z" });
    expect(send).not.toHaveBeenCalled();
  });

  it("leaves a repeat's record alone when it cannot be read", async () => {
    blob.head.mockResolvedValue({ pathname: "x" });
    blob.get.mockRejectedValue(new Error("read failed"));
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "seeker" }));
    expect((await res.json()).already_registered).toBe(true);
    expect(blob.put).not.toHaveBeenCalled();
  });

  it("refuses a phone the form does not offer, and stores nothing", async () => {
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "blackberry" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "invalid_platform" });
    expect(blob.put).not.toHaveBeenCalled();
  });

  it("refuses something that is not an address", async () => {
    const { POST } = await import("./route");
    for (const email of ["reader.example.com", "reader@", "@example.com", "", 42]) {
      const res = await POST(ask({ email, platform: "iphone" }));
      expect(res.status).toBe(400);
    }
    expect(blob.put).not.toHaveBeenCalled();
  });

  it("tells a filled honeypot it succeeded, and writes nothing", async () => {
    line.kv = memoryKv();
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "bot@example.com", platform: "iphone", website: "https://spam" }));
    expect(await res.json()).toEqual({ success: true });
    expect(blob.put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
    expect(await (line.kv as Kv).get("spot:seq")).toBeNull();
  });

  it("turns a bot away before anything else runs", async () => {
    checkBotId.mockResolvedValue({ isBot: true });
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "iphone" }));
    expect(res.status).toBe(403);
    expect(blob.head).not.toHaveBeenCalled();
  });

  it("keeps the address by mail when the store does not answer", async () => {
    blob.head.mockRejectedValue(new Error("store down"));
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "android" }));
    expect(await res.json()).toEqual({ success: true, already_registered: false, spot: null });
    expect(send.mock.calls[0]![0].subject).toBe("Spot waitlist rescue: reader@example.com");
    expect(send.mock.calls[0]![0].text).toContain("platform: android");
  });

  it("only turns the reader away when the store AND the rescue mail fail", async () => {
    blob.head.mockRejectedValue(new Error("store down"));
    send.mockResolvedValue({ data: null, error: { message: "resend down" } });
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "android" }));
    expect(res.status).toBe(500);
  });

  it("does the same when mail was never configured", async () => {
    delete process.env.RESEND_API_KEY;
    blob.head.mockRejectedValue(new Error("store down"));
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "android" }));
    expect(res.status).toBe(500);
    expect(send).not.toHaveBeenCalled();
  });
});

describe("POST /api/waitlist with the line up", () => {
  it("gives a newcomer a place and a code, and files the code with the address", async () => {
    line.kv = memoryKv();
    const { POST } = await import("./route");
    const body = await (await POST(ask({ email: "reader@example.com", platform: "iphone" }))).json();
    expect(body).toMatchObject({ success: true, already_registered: false, spot: { rank: 1, referrals: 0 } });
    expect(body.spot.code).toMatch(/^[2-9A-HJ-NP-Z]{7}$/);
    expect(stored()).toMatchObject({ email: "reader@example.com", code: body.spot.code });
  });

  it("moves the friend whose link brought someone, and notes who it was", async () => {
    const kv = memoryKv();
    line.kv = kv;
    const codes: string[] = [];
    for (let i = 1; i <= 14; i++) codes.push((await join(kv, personFor(`p${i}@example.com`))).code);
    const { POST } = await import("./route");

    const body = await (await POST(ask({ email: "friend@example.com", platform: "android", ref: codes[13].toLowerCase() }))).json();
    expect(body.spot.rank).toBe(15);
    expect(await spotOf(kv, codes[13])).toEqual({ code: codes[13], rank: 4, referrals: 1 });
    expect(stored()).toMatchObject({ email: "friend@example.com", referred_by: codes[13] });
  });

  it("credits no one for a repeat, even through a link", async () => {
    const kv = memoryKv();
    line.kv = kv;
    const owner = (await join(kv, personFor("owner@example.com"))).code;
    const { POST } = await import("./route");
    const first = await (await POST(ask({ email: "reader@example.com", platform: "iphone" }))).json();

    blob.head.mockResolvedValue({ pathname: "x" });
    blob.get.mockResolvedValue(blobOf(stored()));
    const again = await (await POST(ask({ email: "Reader+again@example.com", platform: "iphone", ref: owner }))).json();
    expect(again).toMatchObject({ already_registered: true, spot: { code: first.spot.code, rank: 2 } });
    expect((await spotOf(kv, owner))!.referrals).toBe(0);
  });

  it("still keeps the address when the line is down", async () => {
    const broken = memoryKv();
    broken.get = async () => {
      throw new Error("redis down");
    };
    line.kv = broken;
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "iphone", ref: "K7P2QXM" }));
    expect(await res.json()).toEqual({ success: true, already_registered: false, spot: null });
    expect(stored()).not.toHaveProperty("code");
    expect(stored()).not.toHaveProperty("referred_by");
  });

  it("carries the code in the rescue mail when the store is down", async () => {
    line.kv = memoryKv();
    blob.head.mockRejectedValue(new Error("store down"));
    const { POST } = await import("./route");
    const body = await (await POST(ask({ email: "reader@example.com", platform: "android" }))).json();
    expect(body.spot.rank).toBe(1);
    expect(send.mock.calls[0]![0].text).toContain(`code:     ${body.spot.code}`);
  });
});

describe("GET /api/waitlist", () => {
  it("tells a code where it stands, and nothing more", async () => {
    const kv = memoryKv();
    line.kv = kv;
    const { code } = await join(kv, personFor("reader@example.com"));
    const { GET } = await import("./route");
    const res = await GET(lookup(code.toLowerCase()));
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ success: true, spot: { code, rank: 1, referrals: 0 } });
  });

  it("answers an unknown code, a malformed one, and a missing line apart", async () => {
    line.kv = memoryKv();
    const { GET } = await import("./route");
    expect((await GET(lookup("ZZZZZZZ"))).status).toBe(404);
    expect((await GET(lookup("nope"))).status).toBe(400);
    line.kv = null;
    expect((await GET(lookup("ZZZZZZZ"))).status).toBe(503);
  });
});

describe("GET /r/[code]", () => {
  it("sends a shared link to the home page with the code in hand", async () => {
    const { GET } = await import("../../r/[code]/route");
    const res = await GET(new Request("https://www.usespot.fun/r/k7p2qxm"), { params: Promise.resolve({ code: "k7p2qxm" }) });
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://www.usespot.fun/?r=K7P2QXM");

    const bad = await GET(new Request("https://www.usespot.fun/r/nope"), { params: Promise.resolve({ code: "nope" }) });
    expect(bad.headers.get("location")).toBe("https://www.usespot.fun/");
  });
});
