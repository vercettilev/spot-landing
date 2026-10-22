import { describe, expect, it } from "vitest";
import { firstThen, lineReader } from "./lines";

const bytes = (s: string) => new TextEncoder().encode(s);

/* A body that arrives in the chunks given, each when its turn comes; `hold` keeps the rest back until released. */
function body(chunks: (string | Uint8Array)[], opts: { breakOff?: boolean; hold?: Promise<void>; after?: number } = {}) {
  let i = 0;
  return new ReadableStream<Uint8Array>({
    async pull(controller) {
      if (opts.hold && i === (opts.after ?? 1)) await opts.hold;
      if (i < chunks.length) {
        const c = chunks[i++]!;
        controller.enqueue(typeof c === "string" ? bytes(c) : c);
      } else if (opts.breakOff) {
        controller.error(new Error("connection reset"));
      } else {
        controller.close();
      }
    },
  });
}

describe("an answer in lines", () => {
  it("is read line by line, however the bytes were cut", async () => {
    const coin = bytes('{"name":"Café"}\n');
    const cut = coin.indexOf(0xc3) + 1; /* inside the é */
    const read = lineReader(body([coin.slice(0, cut), coin.slice(cut), '\n{"a":', '1}\n{"b":2}']));
    expect(await read()).toBe('{"name":"Café"}');
    expect(await read()).toBe('{"a":1}');
    expect(await read()).toBe('{"b":2}');
    expect(await read()).toBeNull();
  });

  it("hands over the coin before the verdict is in, and the verdict when it comes", async () => {
    let release = () => {};
    const hold = new Promise<void>((r) => (release = r));
    const res = new Response(body(['{"ok":true,"status":"found"}\n', '{"sniff":{"level":"ok"}}\n'], { hold }), { status: 200 });
    const { answer, then } = await firstThen<{ status: string }>(res);
    expect(answer).toMatchObject({ ok: true, value: { status: "found" } });
    let came = false;
    void then.then(() => (came = true));
    await new Promise((r) => setTimeout(r, 20));
    expect(came).toBe(false);
    release();
    expect(await then).toEqual({ sniff: { level: "ok" } });
  });

  it("is all first line when it is not in lines: an older server, or an error", async () => {
    const one = await firstThen<{ status: string }>(new Response('{"ok":true,"status":"ambiguous"}', { status: 200 }));
    expect(one.answer).toMatchObject({ ok: true, value: { status: "ambiguous" } });
    expect(await one.then).toBeNull();
    const down = await firstThen(new Response('{"ok":false,"error":"lookup_failed"}', { status: 503 }));
    expect(down.answer).toMatchObject({ ok: false, error: "lookup_failed" });
    expect(await down.then).toBeNull();
    expect((await firstThen(new Response("Too Many Requests", { status: 429 }))).answer).toEqual({ ok: false, error: "busy" });
    expect((await firstThen(new Response("<html>oops</html>", { status: 502 }))).answer).toEqual({ ok: false, error: "bad" });
  });

  it("has no next line when the stream breaks off after the first, or the line is not whole", async () => {
    const cut = await firstThen(new Response(body(['{"ok":true,"status":"found"}\n'], { breakOff: true }), { status: 200 }));
    expect(cut.answer.ok).toBe(true);
    expect(await cut.then).toBeNull();
    const half = await firstThen(new Response(body(['{"ok":true,"status":"found"}\n{"sniff":{"lev']), { status: 200 }));
    expect(await half.then).toBeNull();
  });
});
