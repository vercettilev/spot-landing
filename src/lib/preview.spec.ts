import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * A preview deployment tries the form for real and keeps nothing: no
 * address reaches the store and no place reaches the live line, whatever
 * the environment connects. The site itself writes as before.
 */
const blob = vi.hoisted(() => {
  class BlobNotFoundError extends Error {}
  return { head: vi.fn(), put: vi.fn(), get: vi.fn(), list: vi.fn(), BlobNotFoundError };
});
vi.mock("@vercel/blob", () => blob);

const redis = vi.hoisted(() => ({ made: 0 }));
vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor() {
      redis.made++;
    }
  },
}));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
  blob.head.mockReset();
  blob.put.mockReset();
  redis.made = 0;
});

describe("a preview deployment", () => {
  it("keeps addresses out of the store, and still knows a second press", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const { recordSignup } = await import("./store");
    expect(await recordSignup("a@x.com", "android")).toEqual({ stored: true, isNew: true });
    expect(await recordSignup("a@x.com", "android")).toEqual({ stored: true, isNew: false });
    expect(blob.head).not.toHaveBeenCalled();
    expect(blob.put).not.toHaveBeenCalled();
  });

  it("keeps its line in memory, even with the live Redis connected", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("KV_REST_API_URL", "https://live.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "live");
    const { getKv, join, personFor, spotOf } = await import("./line");
    const kv = getKv()!;
    const { code } = await join(kv, personFor("a@x.com"));
    expect((await spotOf(kv, code))?.rank).toBe(1);
    expect(redis.made).toBe(0);
  });
});

describe("the site", () => {
  it("writes to the store and the live line as before", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("KV_REST_API_URL", "https://live.upstash.io");
    vi.stubEnv("KV_REST_API_TOKEN", "live");
    blob.head.mockRejectedValue(new blob.BlobNotFoundError("not found"));
    blob.put.mockResolvedValue({ pathname: "x" });
    const { recordSignup } = await import("./store");
    expect(await recordSignup("a@x.com", "android")).toEqual({ stored: true, isNew: true });
    expect(blob.put).toHaveBeenCalledTimes(1);
    const { getKv } = await import("./line");
    getKv();
    expect(redis.made).toBe(1);
  });
});
