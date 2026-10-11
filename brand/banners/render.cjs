/**
 * RENDERS banners.html TO PNG, one file per artboard, at 1x (the size each
 * platform asks for) and 2x (sharper after the platform scales it down).
 *
 *   npm i -g playwright            # once; uses its Chromium
 *   NODE_PATH="$(npm root -g)" node brand/banners/render.cjs
 *
 * The puppy is not copied into the HTML: it is read from
 * src/components/puppyArt.ts here, so the banners draw the same rig as the
 * site and change when it does. Fonts come from Google Fonts, so this needs
 * the network. The link card also becomes the site's social image.
 */
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "../..");
const OUT = __dirname;

/* The link card is also the site's social image: Next.js serves these two
   files from src/app, so a new render replaces them too. */
const CARD_COPIES = ["src/app/opengraph-image.png", "src/app/twitter-image.png"];

function readArt() {
  const src = fs.readFileSync(path.join(ROOT, "src/components/puppyArt.ts"), "utf8");
  const pick = (name) => {
    const m = src.match(new RegExp(`export const ${name} = ("(?:[^"\\\\]|\\\\.)*");`));
    if (!m) throw new Error(`${name} not found in puppyArt.ts`);
    return JSON.parse(m[1]);
  };
  const viewBox = src.match(/export const PUPPY_VIEWBOX = "([^"]+)"/)[1];
  return { viewBox, inner: pick("PUPPY_INNER"), halo: pick("PUPPY_INNER_HALO") };
}

/* Ears per face, the resting poses in SpotPuppy.tsx: happy lifts them,
   angry drops them. */
const EARS = { "": 0, Bl: 0, Wk: 0, Hp: 5, Ag: -4 };

async function main() {
  const art = readArt();
  const browser = await chromium.launch(
    process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  );
  const file = "file://" + path.join(__dirname, "banners.html");

  for (const scale of [1, 2]) {
    const page = await browser.newPage({ deviceScaleFactor: scale, viewport: { width: 1800, height: 1000 } });
    await page.goto(file, { waitUntil: "networkidle" });
    await page.evaluate(({ art, EARS }) => {
      let n = 0;
      for (const svg of document.querySelectorAll("svg.pup")) {
        const p = `pup${n++}`;
        const face = svg.dataset.face || "";
        svg.setAttribute("viewBox", art.viewBox);
        svg.setAttribute("aria-hidden", "true");
        svg.innerHTML = (svg.hasAttribute("data-halo") ? art.halo : art.inner).replaceAll("__P__", p);
        for (const f of ["Bl", "Wk", "Hp", "Ag"]) {
          const g = svg.querySelector(`[id="${p}${f}"]`);
          if (g) g.style.display = f === face ? "inline" : "none";
        }
        const ey = EARS[face] ?? 0;
        for (const id of ["EL", "ER", "ELh", "ERh"]) {
          svg.querySelector(`[id="${p}${id}"]`)?.setAttribute("transform", `translate(0 ${-ey})`);
        }
      }
    }, { art, EARS });
    await page.evaluate(() => document.fonts.ready);

    for (const id of await page.$$eval("section.board", (els) => els.map((e) => e.id))) {
      const name = scale === 1 ? `${id}.png` : `${id}@2x.png`;
      await page.locator(`#${id}`).screenshot({ path: path.join(OUT, name) });
      console.log("wrote", path.relative(ROOT, path.join(OUT, name)));
    }
    await page.close();
  }
  await browser.close();

  for (const to of CARD_COPIES) {
    fs.copyFileSync(path.join(OUT, "link-card.png"), path.join(ROOT, to));
    console.log("wrote", to);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
