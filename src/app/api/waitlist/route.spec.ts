import { createHash } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * The door to the list: what gets stored, what is refused, and what happens
 * when the store does not answer. Each case is checked against the store and
 * mail mocks, because a wrong answer here is either a lost address or junk on
 * the list that decides which phone gets the first build.
 */
const checkBotId = vi.fn();
vi.mock("botid/server", () => ({ checkBotId: () => checkBotId() }));

const blob = vi.hoisted(() => {
  class BlobNotFoundError extends Error {}
  return { head: vi.fn(), put: vi.fn(), BlobNotFoundError };
});
vi.mock("@vercel/blob", () => ({ head: blob.head, put: blob.put, BlobNotFoundError: blob.BlobNotFoundError }));

const send = vi.fn();
vi.mock("resend", () => ({
  Resend: class {
    emails = { send };
  },
}));

let ip = 0;
const ask = (body: unknown) =>
  new Request("https://example.com/api/waitlist", {
    method: "POST",
    headers: { "content-type": "application/json", "x-real-ip": `10.0.0.${++ip}` },
    body: JSON.stringify(body),
  });
const hash = (email: string) => createHash("sha256").update(email).digest("hex");

beforeEach(() => {
  process.env.RESEND_API_KEY = "re_test";
  process.env.MAIL_FROM = "Spot <hello@example.com>";
  process.env.OPS_INBOX = "ops@example.com";
  for (const m of [checkBotId, blob.head, blob.put, send]) m.mockReset();
  checkBotId.mockResolvedValue({ isBot: false });
  blob.head.mockRejectedValue(new blob.BlobNotFoundError("not found"));
  blob.put.mockResolvedValue({ pathname: "x" });
  send.mockResolvedValue({ data: { id: "m1" }, error: null });
});

describe("POST /api/waitlist", () => {
  it("stores a new address with the phone it picked, then tells us", async () => {
    const { POST } = await import("./route");
    const res = await POST(ask({ email: " Reader@Example.com ", platform: "Android", website: "" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true, already_registered: false });

    const [pathname, body, options] = blob.put.mock.calls[0]!;
    expect(pathname).toBe(`signups/${hash("reader@example.com")}.json`);
    expect(JSON.parse(body)).toMatchObject({ email: "reader@example.com", platform: "android", source: "landing" });
    expect(options).toMatchObject({ access: "private", addRandomSuffix: false, allowOverwrite: true });
    expect(send.mock.calls[0]![0].subject).toBe("New Spot signup: reader@example.com (android)");
  });

  it("answers a repeat without a second notice", async () => {
    blob.head.mockResolvedValue({ pathname: "x" });
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "reader@example.com", platform: "seeker" }));
    expect(await res.json()).toEqual({ success: true, already_registered: true });
    expect(send).not.toHaveBeenCalled();
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
    const { POST } = await import("./route");
    const res = await POST(ask({ email: "bot@example.com", platform: "iphone", website: "https://spam" }));
    expect(await res.json()).toEqual({ success: true });
    expect(blob.put).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
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
    expect(await res.json()).toEqual({ success: true });
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
