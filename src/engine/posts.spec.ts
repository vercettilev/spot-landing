import { describe, expect, it } from "vitest";
import { COIN_A, fakeFetch, jsonResponse } from "@/engine/fakes";
import { readLink } from "./links";
import { decodeEntities, makeExpander, makePostReader, readTelegramWidget, readXEmbed } from "./posts";

const X_HTML =
  '<blockquote class="twitter-tweet"><p lang="en" dir="ltr">' +
  '<a href="https://twitter.com/search?q=%24EXAMPLE&amp;src=ctag&amp;ref_src=twsrc%5Etfw">$EXAMPLE</a> breaking out &amp; still early.<br><br>' +
  `CA: ${COIN_A}<br>chart <a href="https://t.co/AbC123">dexscreener.com/solana/7qbr…</a> ` +
  '<a href="https://t.co/Pic999">pic.twitter.com/Pic999</a></p>&mdash; Ana (@ana_trades) ' +
  '<a href="https://twitter.com/ana_trades/status/1845678901234567890?ref_src=twsrc%5Etfw">October 12, 2026</a></blockquote>';

const TG_HTML =
  '<div class="tgme_widget_message_bubble"><div class="tgme_widget_message_text js-message_text" dir="auto">' +
  '<b>NEW CALL</b> 🚀<br/><a href="https://pump.fun/coin/' + COIN_A + '" target="_blank">pump.fun/coin/GAKD…</a><br/>$EXAMPLE &#036;10k mc' +
  '</div><div class="tgme_widget_message_footer">…</div></div>';

const xRef = readLink("https://x.com/ana_trades/status/1845678901234567890")!.post!;

describe("an X embed", () => {
  it("is the post's words, its line breaks, and only its own links", () => {
    const { text, links } = readXEmbed(X_HTML);
    expect(text).toBe(`$EXAMPLE breaking out & still early.\nCA: ${COIN_A}\nchart dexscreener.com/solana/7qbr… pic.twitter.com/Pic999`);
    expect(links).toEqual(["https://t.co/AbC123", "https://t.co/Pic999"]);
  });

  it("leaves X's own byline out", () => {
    expect(readXEmbed(X_HTML).text).not.toContain("October 12");
  });
});

describe("a Telegram widget", () => {
  it("is the message block's words and real links", () => {
    expect(readTelegramWidget(TG_HTML)).toEqual({
      text: "NEW CALL 🚀\npump.fun/coin/GAKD…\n$EXAMPLE $10k mc",
      links: [`https://pump.fun/coin/${COIN_A}`],
    });
    expect(readTelegramWidget("<html>nothing here</html>")).toBeNull();
  });
});

describe("entities", () => {
  it("decode once, named and numbered", () => {
    expect(decodeEntities("&lt;b&gt; &#36;WIF &#x1F680; &amp;lt; &bogus;")).toBe("<b> $WIF 🚀 &lt; &bogus;");
  });
});

describe("reading a post", () => {
  it("asks X's oEmbed and keeps the handle", async () => {
    const fetchFn = fakeFetch([
      ["https://publish.twitter.com/oembed", () => jsonResponse({ html: X_HTML, author_name: "Ana", author_url: "https://twitter.com/ana_trades" })],
    ]);
    const read = makePostReader({ fetchFn });
    const got = await read(xRef);
    expect(got).toMatchObject({ ok: true, value: { platform: "x", author: "@ana_trades", links: ["https://t.co/AbC123", "https://t.co/Pic999"] } });
    expect(fetchFn.seen[0]!.url).toBe(
      "https://publish.twitter.com/oembed?url=https%3A%2F%2Fx.com%2Fana_trades%2Fstatus%2F1845678901234567890&omit_script=1&dnt=true",
    );
  });

  it("reads each post once in a while, not once per share", async () => {
    const fetchFn = fakeFetch([["https://publish.twitter.com/oembed", () => jsonResponse({ html: X_HTML })]]);
    const read = makePostReader({ fetchFn });
    await read(xRef);
    await read(xRef);
    expect(fetchFn.seen).toHaveLength(1);
  });

  it("has no words for a deleted or private post, and says when X was unreachable", async () => {
    const gone = makePostReader({ fetchFn: fakeFetch([["https://publish.twitter.com/", () => jsonResponse({ error: "not found" }, 404)]]) });
    expect(await gone(xRef)).toEqual({ ok: false, reason: "unavailable" });
    const down = makePostReader({ fetchFn: fakeFetch([]) });
    expect(await down(xRef)).toEqual({ ok: false, reason: "network_error" });
  });

  it("takes a TikTok caption and a YouTube title", async () => {
    const fetchFn = fakeFetch([
      ["https://www.tiktok.com/oembed", () => jsonResponse({ title: "$EXAMPLE is sending", author_unique_id: "ana.trades", author_name: "Ana" })],
      ["https://www.youtube.com/oembed", () => jsonResponse({ title: "Why $EXAMPLE could 10x", author_name: "Ana Trades" })],
    ]);
    const read = makePostReader({ fetchFn });
    const tt = await read(readLink("https://www.tiktok.com/@ana.trades/video/7412345678901234567")!.post!);
    expect(tt).toEqual({ ok: true, value: { platform: "tiktok", text: "$EXAMPLE is sending", links: [], author: "@ana.trades" } });
    const yt = await read(readLink("https://youtu.be/dQw4w9WgXcQ")!.post!);
    expect(yt).toEqual({ ok: true, value: { platform: "youtube", text: "Why $EXAMPLE could 10x", links: [], author: "Ana Trades" } });
  });

  it("reads a public Telegram post through its embed widget", async () => {
    const fetchFn = fakeFetch([["https://t.me/solana_calls/4821?embed=1&mode=tme", () => new Response(TG_HTML)]]);
    const read = makePostReader({ fetchFn });
    const got = await read(readLink("https://t.me/solana_calls/4821")!.post!);
    expect(got).toMatchObject({ ok: true, value: { platform: "telegram", author: "@solana_calls", links: [`https://pump.fun/coin/${COIN_A}`] } });
  });
});

describe("a short link", () => {
  const redirect = (location: string) => () => new Response(null, { status: 301, headers: { location } });

  it("is asked where it goes, hop by hop, without the target ever being fetched", async () => {
    const fetchFn = fakeFetch([
      ["https://bit.ly/spotcoin", redirect("https://t.co/AbC123")],
      ["https://t.co/AbC123", redirect(`https://pump.fun/coin/${COIN_A}?ref=ana`)],
    ]);
    const expand = makeExpander({ fetchFn });
    expect(await expand("https://bit.ly/spotcoin")).toBe(`https://pump.fun/coin/${COIN_A}?ref=ana`);
    expect(fetchFn.seen.map((s) => new URL(s.url).host)).toEqual(["bit.ly", "t.co"]);
    expect(fetchFn.seen.every((s) => s.init?.redirect === "manual")).toBe(true);
  });

  it("is read from t.co's refresh page when that is what it answers", async () => {
    const page = `<head><meta http-equiv="refresh" content="0;URL=https://pump.fun/coin/${COIN_A}"><title>https://pump.fun/coin/${COIN_A}</title></head>`;
    const expand = makeExpander({ fetchFn: fakeFetch([["https://t.co/", () => new Response(page)]]) });
    expect(await expand("https://t.co/Zz9")).toBe(`https://pump.fun/coin/${COIN_A}`);
  });

  it("expands TikTok's share links to the video", async () => {
    const expand = makeExpander({
      fetchFn: fakeFetch([["https://vm.tiktok.com/ZMabc123/", redirect("https://www.tiktok.com/@ana.trades/video/7412345678901234567?_r=1")]]),
    });
    expect(await expand("https://vm.tiktok.com/ZMabc123/")).toBe("https://www.tiktok.com/@ana.trades/video/7412345678901234567?_r=1");
  });

  it("is never followed when it is not a shortener, and is null when the shortener will not say", async () => {
    const fetchFn = fakeFetch([["https://t.co/", () => new Response("nope", { status: 404 })]]);
    const expand = makeExpander({ fetchFn });
    expect(await expand("https://evil.example/redirect")).toBeNull();
    expect(await expand("https://t.co/missing")).toBeNull();
    expect(fetchFn.seen.map((s) => new URL(s.url).host)).toEqual(["t.co"]);
  });
});
