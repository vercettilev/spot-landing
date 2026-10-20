/**
 * THE LINK CARD: src/app/opengraph-image.png and twitter-image.png, the
 * picture a link to the page shows on X, Telegram and the rest (1200x630).
 * It is drawn from the page itself, so it changes when the page does: the
 * line, the support line and the platforms in the page's type, and two
 * copies of the phone demo held at two moments of its X loop, the share
 * sheet with Spot lit behind and Spot's screen stamped CLEAN with Ape $25 in
 * front. The bottom left stays clear, where X lays the page's title over a
 * card.
 *
 *   npm i -g playwright            # once; uses its Chromium
 *   npm run dev                    # the page, in another terminal
 *   NODE_PATH="$(npm root -g)" node brand/card/render.cjs [http://localhost:3000]
 *
 * Drawn at 2x and brought down to 1200x630 with ffmpeg (lanczos), for clean
 * edges on the tilted phones. Keep the alt text beside the images
 * (opengraph-image.alt.txt, twitter-image.alt.txt) saying what the card says.
 */
const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "../..");
const PAGE = process.argv[2] || "http://localhost:3000/";

const SUPPORT = "Buy crypto from any post, in 4 taps.";
const PLATFORMS = "Coming soon · iPhone · Android · Solana Seeker";

/* The two moments, in the demo's milliseconds (PhoneDemo.module.css): Spot
   lit in the sheet, and the coin stamped CLEAN with Ape $25 waiting, before
   the key is lit. Placed as the launch banner placed them: from the top left
   corner, scaled from the frame's 428 points, turned. */
const PHONES = [
  { at: 4_800, left: 645, top: 150, scale: 0.6, turn: -8 },
  { at: 8_900, left: 915, top: 92, scale: 0.64, turn: 6 },
];

/* The banner's film grain, faint. */
const GRAIN =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>',
  );

async function main() {
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
  await page.goto(PAGE, { waitUntil: "networkidle" });

  await page.evaluate(
    async ({ SUPPORT, PLATFORMS, PHONES, GRAIN }) => {
      const stage = document.querySelector('[class*="stage"]');
      const demo = stage.closest("figure");
      document.documentElement.style.overflow = "hidden";

      const card = document.createElement("div");
      card.id = "card";
      card.style.cssText =
        "position:fixed;left:0;top:0;z-index:2147483647;width:1200px;height:630px;overflow:hidden;background:#0b0b0c;";
      card.innerHTML = `
        <div style="position:absolute;left:560px;top:-300px;width:1300px;height:1300px;border-radius:50%;opacity:0.45;
          background:radial-gradient(circle, rgba(252,78,2,0.55) 0%, rgba(252,78,2,0.16) 32%, rgba(252,78,2,0) 62%)"></div>
        <div style="position:absolute;inset:0;opacity:0.06;background:url('${GRAIN}')"></div>
        <div style="position:absolute;left:72px;top:60px;display:flex;align-items:center;gap:14px">
          <img src="/spot-icon.svg" alt="" style="display:block;width:52px;height:auto">
          <img src="/spot-wordmark-white.svg" alt="" style="display:block;width:114px;height:auto">
        </div>
        <div style="position:absolute;left:72px;top:150px;width:600px;display:flex;flex-direction:column;gap:22px">
          <h1 style="margin:0;font-family:var(--font-display-stack);font-weight:900;font-size:124px;line-height:0.96;letter-spacing:-0.045em;color:#fff">
            <span style="display:block;white-space:nowrap">Spot it.</span>
            <span style="display:block;white-space:nowrap;color:#fc4e02">Buy it.</span>
          </h1>
          <p style="margin:0;max-width:520px;font-family:var(--font-body), system-ui, sans-serif;font-weight:600;font-size:27px;line-height:1.28;color:rgba(255,255,255,0.74)">${SUPPORT}</p>
          <p style="margin:6px 0 0;font-family:var(--font-display-stack);font-weight:800;font-size:21px;letter-spacing:-0.01em;color:#fc4e02;white-space:nowrap">${PLATFORMS}</p>
        </div>`;

      /* Each phone is the demo's own, copied with the demo's class around it
         for its clocks (--t, --m), and held at its moment. */
      const held = [];
      for (const p of PHONES) {
        const phone = document.createElement("div");
        phone.className = demo.classList[0];
        phone.style.cssText = `position:absolute;left:${p.left}px;top:${p.top}px;margin:0;padding:0;--phone-w:${428 * p.scale}px;--d:0s;transform:rotate(${p.turn}deg);transform-origin:0 0;`;
        phone.appendChild(stage.cloneNode(true));
        card.appendChild(phone);
        held.push([phone, p.at]);
      }
      document.body.appendChild(card);
      for (const [phone, at] of held) {
        for (const a of phone.getAnimations({ subtree: true })) {
          a.pause();
          a.currentTime = at;
        }
      }

      await Promise.all([...card.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
      await document.fonts.ready;
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    },
    { SUPPORT, PLATFORMS, PHONES, GRAIN },
  );

  const big = path.join(os.tmpdir(), "spot-card@2x.png");
  await page.screenshot({ path: big, clip: { x: 0, y: 0, width: 1200, height: 630 } });
  await browser.close();

  const card = path.join(ROOT, "src/app/opengraph-image.png");
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", big, "-vf", "scale=1200:630:flags=lanczos", "-pix_fmt", "rgb24", card]);
  fs.copyFileSync(card, path.join(ROOT, "src/app/twitter-image.png"));
  fs.rmSync(big);
  console.log("wrote src/app/opengraph-image.png and src/app/twitter-image.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
