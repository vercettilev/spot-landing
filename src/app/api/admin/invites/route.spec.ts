import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { personFor } from "@/lib/line";
import { memoryKv } from "@/lib/memoryKv";
import type { SignupRecord } from "@/lib/store";

/**
 * The route that mails the list: shut without the owner's key, and when it
 * sends, each person once, in line order, with a failed email given back for
 * the next press. Resend and the store are mocks; the line is in memory.
 */
const line = vi.hoisted(() => ({ kv: null as unknown }));
vi.mock("@/lib/line", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/line")>()),
  getKv: () => line.kv,
}));

const store = vi.hoisted(() => ({ records: [] as SignupRecord[] }));
vi.mock("@/lib/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/store")>()),
  allSignups: async () => store.records,
}));

const resend = vi.hoisted(() => ({ batch: vi.fn(), single: vi.fn() }));
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resend.single };
    batch = { send: resend.batch };
  },
}));

import { GET, POST } from "./route";

const KEY = "k".repeat(32);
const ask = (method: "GET" | "POST", body?: object, key = KEY) =>
  new Request("https://example.com/api/admin/invites", {
    method,
    headers: { "x-spot-key": key, "content-type": "application/json", "x-real-ip": "10.9.9.9" },
    body: body ? JSON.stringify(body) : undefined,
  });

const rec = (email: string, code: string, at: string): SignupRecord => ({ email, platform: "android", created_at: `2026-10-${at}T00:00:00.000Z`, source: "landing", code });

describe("the invites route", () => {
  beforeEach(() => {
    vi.stubEnv("SPOT_ADMIN_KEY", KEY);
    vi.stubEnv("RESEND_API_KEY", "re_test");
    vi.stubEnv("MAIL_FROM", "Spot <hello@usespot.fun>");
    vi.stubEnv("INVITE_URL_ANDROID", "https://example.com/spot.apk");
    vi.stubEnv("MAIL_POSTAL_ADDRESS", "");
    resend.batch.mockReset();
    resend.single.mockReset();
  });
  afterEach(() => vi.unstubAllEnvs());

  it("is not there without a long key, and refuses a wrong one", async () => {
    vi.stubEnv("SPOT_ADMIN_KEY", "short");
    expect((await GET(ask("GET"))).status).toBe(404);
    vi.stubEnv("SPOT_ADMIN_KEY", KEY);
    expect((await GET(ask("GET", undefined, "x".repeat(32)))).status).toBe(401);
    expect((await POST(ask("POST", { action: "send", count: 5 }, "nope"))).status).toBe(401);
  });

  it("invites in line order, once, and gives a failed email back", async () => {
    const kv = memoryKv();
    line.kv = kv;
    const { join } = await import("@/lib/line");
    const a = await join(kv, personFor("a@x.com"));
    const b = await join(kv, personFor("b@x.com"));
    const c = await join(kv, personFor("c@x.com"));
    store.records = [rec("c@x.com", c.code, "13"), rec("a@x.com", a.code, "11"), rec("b@x.com", b.code, "12")];

    /* Resend takes the first two and refuses the second of them. */
    resend.batch.mockResolvedValueOnce({ data: { data: [{ id: "1" }, { id: "2" }], errors: [{ index: 1, message: "bounced" }] }, error: null });
    const first = await (await POST(ask("POST", { action: "send", count: 2 }))).json();
    expect(first).toMatchObject({ ok: true, sent: 1, failed: 1 });
    const sentTo = resend.batch.mock.calls[0]![0].map((e: { to: string }) => e.to);
    expect(sentTo).toEqual(["a@x.com", "b@x.com"]);
    expect(resend.batch.mock.calls[0]![0][0].headers["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click");

    /* The next press: not a again; b again, then c. */
    resend.batch.mockResolvedValueOnce({ data: { data: [{ id: "3" }, { id: "4" }], errors: [] }, error: null });
    const second = await (await POST(ask("POST", { action: "send", count: 5 }))).json();
    expect(second).toMatchObject({ ok: true, sent: 2, failed: 0 });
    expect(resend.batch.mock.calls[1]![0].map((e: { to: string }) => e.to)).toEqual(["b@x.com", "c@x.com"]);

    /* And then there is no one left to mail. */
    const third = await (await POST(ask("POST", { action: "send", count: 5 }))).json();
    expect(third).toMatchObject({ ok: true, sent: 0 });
    expect(resend.batch).toHaveBeenCalledTimes(2);
  });

  it("gives every claim back when Resend refuses the whole batch", async () => {
    const kv = memoryKv();
    line.kv = kv;
    const { join } = await import("@/lib/line");
    const a = await join(kv, personFor("a@x.com"));
    store.records = [rec("a@x.com", a.code, "11")];
    resend.batch.mockResolvedValueOnce({ data: null, error: { message: "domain not verified" } });
    const res = await POST(ask("POST", { action: "send", count: 1 }));
    expect(res.status).toBe(502);
    resend.batch.mockResolvedValueOnce({ data: { data: [{ id: "1" }], errors: [] }, error: null });
    expect(await (await POST(ask("POST", { action: "send", count: 1 }))).json()).toMatchObject({ sent: 1 });
  });

  it("gives the claims back when the database fails halfway", async () => {
    const kv = memoryKv();
    const { join } = await import("@/lib/line");
    const a = await join(kv, personFor("a@x.com"));
    const b = await join(kv, personFor("b@x.com"));
    store.records = [rec("a@x.com", a.code, "11"), rec("b@x.com", b.code, "12")];

    /* a is claimed and gets its unsubscribe secret; b's secret fails to save. */
    let secrets = 0;
    line.kv = {
      ...kv,
      setNx: async (k: string, v: string) => {
        if (++secrets > 1) throw new Error("redis down");
        return kv.setNx(k, v);
      },
    };
    expect((await POST(ask("POST", { action: "send", count: 2 }))).status).toBe(502);
    expect(resend.batch).not.toHaveBeenCalled();

    line.kv = kv;
    resend.batch.mockResolvedValueOnce({ data: { data: [{ id: "1" }, { id: "2" }], errors: [] }, error: null });
    expect(await (await POST(ask("POST", { action: "send", count: 2 }))).json()).toMatchObject({ sent: 2 });
  });

  it("shows the list masked, per phone", async () => {
    const kv = memoryKv();
    line.kv = kv;
    const { join } = await import("@/lib/line");
    const a = await join(kv, personFor("alice@x.com"));
    store.records = [rec("alice@x.com", a.code, "11")];
    const body = await (await GET(ask("GET"))).json();
    expect(body).toMatchObject({ ok: true, mail: true, postal: false, links: { android: true, seeker: true, iphone: false } });
    expect(body.byPhone.android).toMatchObject({ onList: 1, waiting: 1 });
    expect(body.next).toEqual([{ place: 1, email: "al•••@x.com", platform: "android" }]);
  });
});
