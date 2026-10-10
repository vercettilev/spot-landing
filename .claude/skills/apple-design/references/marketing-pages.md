# Marketing pages: apple.com patterns

These values come from Apple's production CSS captured in 2026 (the iPhone overview, the shared "sitekit" base, the global and local nav, the footer) and from a May 2026 computed-style pass over the homepage. As of August 2026, apple.com had not adopted Liquid Glass styling; its nav is still a flat translucent bar. Treat every value as a proportion to learn from, applied to your own brand and content. "About" marks guidance that is not an Apple measurement. The size tables are in SKILL.md. Shared CSS (tokens, type classes, glass, buttons, cards, layout, reveal) lives only in web-implementation.md; the CSS here covers page-specific components and uses its §3 tokens, so it follows dark mode and the brand. Apple's raw light-mode values appear in the prose only.

## Contents

1. Page anatomy
2. Grid, widths and rhythm
3. Typography in use
4. Color and section backgrounds
5. Global nav
6. Local (product) nav
7. Buttons and links
8. Heroes
9. Cards, tiles and bento grids
10. Horizontal galleries
11. Imagery and video
12. Scroll and motion
13. Copy voice
14. Footnotes and footer
15. Section recipes
16. Staying original

## 1. Page anatomy

```
global nav   44px (48px at ≤833); scrolls away with the page
local nav    52px; sticky; product name on the left, links and a small Buy pill on the right
hero         60px top padding (40px at ≤1068): name or eyebrow, headline, subhead, CTA pair, media
sections     one idea each; backgrounds alternate white and #f5f5f7, with an occasional black one
index        a grid of links to related pages
footer       #f5f5f7 background, 12px type, legal notes first
```

Apple's product overview order, for reference only (pick your sections from §15 by need; don't reproduce this sequence):

1. A hero with a "chapter nav" row of small product icons with 14px semibold labels.
2. A lineup and compare section on the alt background.
3. A film.
4. A "why buy here" card gallery.
5. A "get to know it" feature-card gallery.
6. Essentials and accessories.
7. A "works with" ecosystem section, built as an image accordion.
8. An index, then the footer.

Rules:

- **One idea per section.** Separate sections with background changes and space, not rules.
- **Section headers.** Start each section with a header: headline on the left, one text link (compare, shop) on the right. On small screens the link drops below the headline.
- **One pinned bar.** The global nav scrolls away and the local nav takes over at the top, so only one bar is ever pinned. Use one sticky bar unless the site really has a product hierarchy (§16).

## 2. Grid, widths and rhythm

| Breakpoint | Range |
|---|---|
| xlarge | ≥1441px |
| large | 1069–1440px |
| medium | 735–1068px |
| small | ≤734px |
| xsmall | ≤480px |

The navs use their own switch points: the global nav at 833/834px and the local nav at 1023/1024 and 833/834px.

Containers:

- **Newer pages:** `width: 87.5%; max-width: 1260px` (max 420px at ≤734). Hero and inline media can reach 1680px at ≥1441.
- **Classic pages:** 980px, then 692px at ≤1068, then 87.5% at ≤734.
- **Nav and footer content:** max 980px with 22px side padding (16px at ≤833). Global nav content is max 1024px.
- **Grids:** a 12-column flex grid. Card sets use CSS grid with 20px gutters. Homepage promo tiles are 2-up with 12px seams running edge to edge.

Rhythm:

- Section padding: 160 / 128 / 96px.
- Dense sections: 112 / 96 / 56px.
- Hero top padding: 60 / 40px.
- Section header: `padding-bottom` 80 / 64 / 48px, `column-gap` 120px.

CSS: the layout tokens (`--section-pad`, `--section-pad-dense`, `--header-gap`, `--content`, `--gutter-card`, `--seam`) are in web-implementation.md §3, and `.section`, `.section--dense`, `.section--alt`, `.content` and `.section-header` are in its §10.

## 3. Typography in use

- **Weights.** 600 for every headline, eyebrow, label, badge and nav title; 400 for body, intro, subheads and buttons. The homepage pass counted weight 400 about 1,300 times, 600 about 580 times, and 700 six times.
- **Line height.** It falls toward 1.0 as size grows (1.05 at 80px). Body stays at 1.47.
- **Eyebrows.** 21–24px semibold in normal case, usually the product name or a "New" badge above the headline. Never small caps or letter-spaced uppercase.
- **Card labels.** 17px semibold in title case, above a 28px headline.
- **Intro paragraphs.** 21px (19px on small screens), weight 400, two to four sentences. Copy on promo tiles is capped at 540px wide (430 at ≤1400, 330 at ≤1068).
- **Giant wordmark hero.** 160px / 0.875 / -0.04em, then 140px / 0.8575 / -0.03em at ≤1068, then 85px / 0.9647 / -0.02em at ≤734, all weight 600. Line height goes below 1 here. On small screens, shrink it to fit 320px.
- **Gradient text.** Used sparingly, on a `<strong>` phrase inside a section headline. Build the gradient from the brand's colors.
- **Dark sections.** Body copy is gray (#86868b) and the key phrase is a `<strong>` in #f5f5f7. That stresses the claim without adding color. Use `.section--dark` (web-implementation.md §3), which re-scopes the dark tokens on the section.
- **Product names.** Never set them in all caps.

```css
.wordmark { font-size: 10rem; line-height: .875; letter-spacing: -.04em; font-weight: 600; }
@media (max-width: 1068px) { .wordmark { font-size: 8.75rem; line-height: .8575; letter-spacing: -.03em; } }
@media (max-width: 734px)  { .wordmark { font-size: min(5.3125rem, 17vw); line-height: .9647; letter-spacing: -.02em;
                                          overflow-wrap: anywhere; } }   /* 17vw: about; fits 320px */

.headline-gradient {                       /* on a <strong> inside the headline; set --brand-1/2 to brand colors */
  background: linear-gradient(90deg, var(--brand-1, var(--accent)), var(--brand-2, var(--link)));
  -webkit-background-clip: text; background-clip: text; color: transparent; font-weight: inherit;
}

.section--dark .copy        { color: var(--text-2); }
.section--dark .copy strong { color: var(--text); }
```

## 4. Color and section backgrounds

**Section backgrounds**

- White, alternating with #f5f5f7. Dark sections use #000, with #1d1d1f as the alternate dark.
- Some Mac pages use tinted near-blacks (an older capture showed a #121217 page with #17171d sections).
- In dark mode the page is #000 too, so a black section merges with plain neighbors. Put the alt background on the sections next to it.

**Cards against sections**

- On a white section, cards are #f5f5f7. On an alt section, cards are #fff.
- In dark mode, cards are #1d1d1f, or #000 on an alt-dark section.

**Where color goes**

- Saturated color appears only in product imagery.
- The homepage is dominated by #1d1d1f, #000, #fff, #e8e8ed and the dark-mode link #2997ff.
- #0071e3 appears only nine times, all as button backgrounds.

**Status and badges**

- Status text: orange #b64400 (dark #ff791b), green #008009, red #e30000.
- "New" badge: 17px/600, padding 6px 9px, radius 6px, #b64400 text on rgba(245,99,0,.1). In dark mode, #ff791b on rgba(245,99,0,.2).

**With a brand**, keep this neutral skeleton. Let brand color appear in imagery, in one featured section and in the accent.

## 5. Global nav

**Layout**

- Height 44px (48px at ≤833). `position: absolute`, so it scrolls away with the page.
- Content max 1024px with 22px side padding. Links are spread with `justify-content: space-between`.

**Links**

- 12px / 400 / -0.01em, with `padding: 0 8px`.
- Color rgba(0,0,0,.8), #000 on hover. On a dark nav, rgba(255,255,255,.8), #fff on hover.

**Scrim (the translucent state)**

- Light: rgba(250,250,252,.8) with `saturate(180%) blur(20px)`; .92 opacity without blur support.
- Dark: rgba(22,22,23,.8); .88 without blur support.

**Flyout menus**

- Panel background #fafafc (dark #161617). The page behind gets a curtain of rgba(232,232,237,.4) with `blur(20px)`.
- Group headers 12px in rgb(110,110,115).
- Large items 24px/600/+0.009em. Regular items 12px/600 in #333336 (dark #e8e8ed).
- Items fade in with a 20ms stagger, eased `cubic-bezier(.4,0,.6,1)` over 0.24–0.32s.

**Focus:** `outline: 2px solid #0071e3`.

**Brand:** use your own wordmark on the left and keep the link count small.

```css
.globalnav { position: absolute; inset: 0 0 auto; height: var(--nav-h); z-index: 50; }   /* 44px, 48px at ≤833 */
.globalnav__inner {
  max-width: 1024px; height: 100%; margin-inline: auto; padding-inline: 22px;
  display: flex; align-items: center; justify-content: space-between;
}
.globalnav a {
  display: inline-flex; align-items: center; min-height: 44px; padding: 0 8px;
  font-size: .75rem; letter-spacing: -.01em; text-decoration: none;
  color: var(--text); opacity: .8; transition: opacity var(--dur) var(--ease);
}
.globalnav a:hover { opacity: 1; }
/* Focus ring: the shared :focus-visible rule (web-implementation.md §9).
   Translucent state: add class="glass glass--bar" (web-implementation.md §6). */
```

## 6. Local (product) nav

**Bar**

- Height 52px (66px for the stacked variant).
- `position: sticky; top: 0`, so it takes over once the global nav has scrolled away.
- Content max 980px with 22px padding (16px at ≤833).

**Contents**

- Title: the product name on the left, 21px / 600 / +0.011em.
- Menu links on the right: 12px / -0.01em. In the collapsed mobile tray they are 14px / -0.02em. A 1px underline marks the current page.

**Keyline**

- 1px rgba(0,0,0,.16) in light mode, rgba(255,255,255,.24) in dark mode.
- 980px wide at rest; full width once the bar is stuck.

**When stuck**

- Background rgba(250,250,252,.8) (dark rgba(22,22,23,.8)) with `saturate(180%) blur(20px)`.
- Transitions over 0.24s with `cubic-bezier(.28,.11,.32,1)`.

**Buy pill**

- 12px / 1.3333 / -0.01em, padding 4px 11px including a 1px border, minimum width 45px, capsule radius.
- Background #0071e3, #0076df on hover, #006edb when active. White text.
- 24px of space before it.
- In code, use `.btn.btn--reduced.hit-expand` (web-implementation.md §9–10). It takes the brand accent and gets a 44px tap area.

```css
/* Markup: <nav class="localnav glass glass--bar" aria-label="…"> with the sentinel right above it */
.localnav { position: sticky; top: 0; z-index: 40; height: var(--localnav-h);
  --glass-edge: var(--hairline);                 /* Apple's keyline, drawn full width by .glass--bar */
  transition: background-color var(--dur-fast) var(--ease-nav); }
.localnav:not(.is-stuck) { background: transparent; border-color: transparent;
  -webkit-backdrop-filter: none; backdrop-filter: none; }   /* glass only once stuck */
.localnav__inner {
  position: relative; max-width: 980px; height: 100%; margin-inline: auto; padding-inline: 22px;
  display: flex; align-items: center; gap: 24px;
}
.localnav__inner::after {                       /* keyline: content-width at rest */
  content: ""; position: absolute; inset: auto 22px 0; border-bottom: 1px solid var(--hairline);
}
.localnav.is-stuck .localnav__inner::after { display: none; }
.localnav__title { margin-right: auto; font-size: 1.3125rem; font-weight: 600; letter-spacing: .011em; color: var(--text); }
.localnav__links a { display: inline-flex; align-items: center; min-height: 44px;
  font-size: .75rem; letter-spacing: -.01em; color: var(--text); text-decoration: none; }
.localnav__links a[aria-current="page"] { text-decoration: underline; text-decoration-thickness: 1px;
  text-underline-offset: .3em; }                 /* offset: about */
```

```js
// Mark the bar as stuck with a 1px sentinel placed directly above it.
const bar = document.querySelector('.localnav');
const sentinel = document.querySelector('.localnav-sentinel');
new IntersectionObserver(([e]) => bar.classList.toggle('is-stuck', !e.isIntersecting)).observe(sentinel);
```

## 7. Buttons and links

All buttons are capsules (`border-radius: 980px`). Heights below are arithmetic from the CSS, not measured renders.

| Size | Font | Padding (including the 1px border) | Height | Typical use |
|---|---|---|---|---|
| reduced | 12px / 1.3333 / -0.01em | 4px 11px | about 24px | nav Buy pill |
| base | 14px / 1.2858 / -0.016em | 9px 16px | about 36px | inside cards |
| elevated | 17px / 1.1765 / -0.022em | 12px 22px | about 44px | hero and tile CTAs |
| super | 17px | 18px 31px | about 56px | a single large CTA |

**Variants**

- **Primary:** #0071e3 background (hover #0077ed, active #006edb), white text.
- **Secondary:** transparent background with #0066cc text and a 1px border. On hover it fills #0077ed with white text. On dark backgrounds use #2997ff.
- **Neutral:** #1d1d1f (hover #272729). On dark, #f5f5f7 with black text. Use it over media.
- **Block:** full width with an 8px radius.

**Focus:** 2px #0071e3 outline, 3px offset.

**Standard pair:** a filled "Learn more" next to an outlined "Buy". Use at most two CTAs per hero or tile, with the primary first.

**Text link with chevron:** 17px #0066cc, underlined on hover only. Apple draws the chevron with a glyph from its own icon font; use an inline SVG or "›" with about 0.24em of space before it.

CSS: web-implementation.md §10 has `.btn` and every variant above (`--elevated`, `--super`, `--reduced`, `--secondary`, `--neutral`, `--block`), plus `.cta-row` and `.more`, all on brand-mappable tokens. The reduced pill is about 24px tall, so give it `.hit-expand` (§9 there).

## 8. Heroes

**A. Product hero (centered)**

- Eyebrow (product name, 24/21px semibold), then the headline (56–80px), then the subhead (21–28px, weight 400), then the CTA pair (elevated), then a large product image below on a plain background.
- The 2026 homepage measured: headline 56px/60px/600/-0.28px, subhead 28px/32px/400/+0.196px, CTAs 17px. Hero content height was about 580px.

**B. Wordmark hero**

- The product name set huge (the `.wordmark` class in §3), with a short line and the CTAs underneath.
- Use it only when the name itself is the message.

**C. Promo mosaic (homepage)**

- Full-width hero units, then 2-up tiles with 12px seams on a white page.
- Tile background #f5f5f7. Headline 40 / 32 / 28px, subhead 21px (19px small).
- Copy max-width 540px (430 at ≤1400, 330 at ≤1068), with the headline 52px from the tile top.
- Text is centered at the top and the image fills the lower part.
- Developer.apple.com's copy of this grid uses tiles about 592 / 502 / 512px tall.

**D. Film hero**

- A 16:9 video with a "watch the film" text link or a play control.
- Never autoplay without a visible pause control.
- Caption it (`<track kind="captions" srclang="en" src="…">`), and add an audio description or a text transcript when the visuals carry information.

**Composition**

- Use one focal subject with generous empty space around it, on white, #f5f5f7 or black.
- Put text above or beside the image, not over busy product imagery; Apple's own product-image guidance places copy beside the image.
- If text must overlay media, add a scrim and check contrast against the brightest part of the image.

```css
.promo-grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--seam); padding: var(--seam); }
@media (max-width: 734px) { .promo-grid { grid-template-columns: 1fr; } }
.promo-tile {
  display: flex; flex-direction: column; align-items: center; text-align: center;
  min-height: 580px; padding-top: 52px; overflow: hidden; background: var(--bg-alt);
}
.promo-tile__copy { max-width: 540px; padding-inline: 1.5rem; }      /* padding: about */
@media (max-width: 1400px) { .promo-tile__copy { max-width: 430px; } }
@media (max-width: 1068px) { .promo-tile__copy { max-width: 330px; } }
.promo-tile__media { margin-top: auto; width: 100%; }
```

## 9. Cards, tiles and bento grids

**Card**

- `border-radius: 28px`, `overflow: hidden` so images clip to the radius.
- No shadow. Apple uses almost none; the homepage pass found exactly one, rgba(0,0,0,.22) 3px 5px 30px.
- Background follows §4.

**Feature card**

- Width 372px, min-height 680px (344×628 medium, 260×480 small).
- Inside: a 17px/600 label, then a 28px/600 headline, then an image filling the rest.
- A 36px circular "+" button sits 16px from the bottom-right corner, inside a 44px hit area. Background rgba(210,210,215,.64), icon rgba(0,0,0,.56). It opens a modal with the detail; modals use a 28px radius.

**Product tile**

- 372px wide with 28px padding and centered text.
- In order: color swatches, product name, a 17px tagline, a 14px gray price, then a filled "Learn more" and an outlined "Buy".

**Bento grid**

- Apply the same card rules across the mosaic: one radius, one 20px gutter, one idea per tile, different spans for emphasis.
- Resist mixing radii or adding borders.

**Hover:** transform over 0.3s with `cubic-bezier(0,0,.5,1)` to a subtle scale, on hover-capable devices only.

`.card`, `.card--flush` and the background flip are in web-implementation.md §10, and the label and headline use its `.t-label` and `.t-card` classes (§4). Feature cards and the rest build on them:

```css
.feature-card { width: 372px; min-height: 680px; display: flex; flex-direction: column; }   /* with .card */
@media (max-width: 1068px) { .feature-card { width: 344px; min-height: 628px; } }
@media (max-width: 734px)  { .feature-card { width: 260px; min-height: 480px; } }
.card__plus {                                   /* 36px visual inside a 44px target */
  position: absolute; right: 12px; bottom: 12px; width: 44px; height: 44px; border: 0; padding: 4px;
  background: transparent; cursor: pointer;
}
.card__plus::before {
  content: "+"; display: grid; place-items: center; width: 36px; height: 36px; border-radius: 50%;
  background: var(--control-scrim); color: var(--control-icon); font-size: 1.5rem;
}
.bento { display: grid; grid-template-columns: repeat(6, 1fr); gap: var(--gutter-card); }
.bento > .card { grid-column: span 3; } .bento > .card--wide { grid-column: span 6; }
@media (max-width: 734px) { .bento > .card { grid-column: span 6; } }
@media (hover: hover) and (prefers-reduced-motion: no-preference) {
  .card--hover { transition: transform var(--dur-hover) var(--ease-out); }
  .card--hover:hover { transform: scale(1.02); }              /* about; Apple's value is unknown */
}
```

## 10. Horizontal galleries

**Scroller:** `overflow-x: scroll` with `scroll-snap-type: x mandatory`, a hidden scrollbar, and `scroll-padding` equal to the page gutter so the first card lines up with the content edge.

**Paddle nav:** 36px circular arrows (56px elevated, 90px super).

**Dot nav**

- 8px dots with 8px margins.
- Color rgba(0,0,0,.42), .54 on hover, .8 for the current dot.

**Accessibility**

- Make the scroller a labeled region that is keyboard focusable.
- Give the paddles text labels.
- Keep the paddles available even when scrolling works, for people who can't swipe.

```css
.gallery {
  --gutter: max(6.25%, (100% - var(--content)) / 2);   /* lines up with .content at every breakpoint */
  display: grid; grid-auto-flow: column; grid-auto-columns: max-content; gap: var(--gutter-card);
  padding-inline: var(--gutter); scroll-padding-inline: var(--gutter);
  overflow-x: scroll; scroll-snap-type: x mandatory; scrollbar-width: none;
}
.gallery::-webkit-scrollbar { display: none; }
.gallery > * { scroll-snap-align: start; }
.paddle { width: 36px; height: 36px; border-radius: 50%; border: 0;   /* add class="hit-expand" */
  background: var(--control-scrim); color: var(--control-icon); }
.dotnav { display: flex; justify-content: center; }
.dotnav button { width: 8px; height: 8px; margin: 0 8px; padding: 0; border: 0; border-radius: 50%;
  background: color-mix(in srgb, var(--text) 42%, transparent); }
.dotnav button:hover { background: color-mix(in srgb, var(--text) 54%, transparent); }
.dotnav button[aria-current="true"] { background: color-mix(in srgb, var(--text) 80%, transparent); }
```

The 8px dots are far below the 44px target, and at 24px apart their hit areas can't grow to 44px without overlapping. Keep the paddles (with `.hit-expand`) as the main control; the dots still meet WCAG 2.5.8's 24px spacing rule.

## 11. Imagery and video

**Imagery**

- Show one subject, isolated on white, #f5f5f7 or black, with generous negative space.
- Use your own photography or rendered product art. A stock-photo look breaks the effect.
- Art-direct each breakpoint. Apple ships separate large, medium and small crops, each with a 2x version, and lazy-loads images below the fold.
- Until real assets exist, use labeled neutral placeholder blocks at the correct aspect ratio rather than borrowed images.

**Showing an app**

- Put the screenshot in an Apple-provided bezel used as-is: no tilt, reflection or added shadow, copy beside the device, at least 200px tall.
- Alternatively, show a frameless screenshot clipped to the card radius.
- Never draw your own Apple device.

**Video**

- Films are 16:9.
- The inline play/pause control sits 20px from the top at the end edge.
- Control colors: in light mode the scrim is rgba(210,210,215,.64) and the icon rgba(0,0,0,.56); in dark mode the scrim is rgba(66,66,69,.72) and the icon rgba(255,255,255,.8). These are the `--control-scrim` and `--control-icon` tokens.
- Under reduced motion, don't autoplay.
- Films need captions (`<track kind="captions">`), and an audio description or a text transcript when the visuals carry information. Muted ambient loops get `aria-hidden="true"` or a text alternative.

**Floating media pill**

- A pill with min-height 56px and a radius equal to its height, 32px from the edge (20px on small screens).
- Light: rgba(232,232,237,.72) with a 7px backdrop blur. Dark: rgba(51,51,54,.7).
- It holds play/pause and the dot nav.

```html
<picture>
  <source media="(max-width: 734px)"  srcset="hero-small.jpg 1x, hero-small@2x.jpg 2x">
  <source media="(max-width: 1068px)" srcset="hero-medium.jpg 1x, hero-medium@2x.jpg 2x">
  <img src="hero-large.jpg" srcset="hero-large@2x.jpg 2x" alt="Describe the product and view"
       width="1260" height="700" loading="lazy" decoding="async">
</picture>
```

Drop `loading="lazy"` on the first hero image so it isn't delayed.

## 12. Scroll and motion

**Staggered fade-in**

- Opacity runs over 0.9s and the 30px rise over 0.7s, with a 0.15s delay per item.
- Apple's easing for this wasn't captured; the standard ease below works.

**Defaults**

- Standard easing is `cubic-bezier(.4,0,.6,1)`: 0.24s for opacity and background, 0.32s for color and size.
- The local nav's stuck transition is 0.24s with `cubic-bezier(.28,.11,.32,1)`.

**Reduced motion**

- Apple disables every animation under reduced motion. Gate movement behind `prefers-reduced-motion: no-preference`.
- Keep content visible if the script never runs: hide elements for the reveal only after JavaScript has added a class.

CSS and script: web-implementation.md §8 (`.reveal` with a stagger that cycles every three items, plus a print fallback).

## 13. Copy voice

Write your own copy in this register. The examples below are for an invented product; never reuse apple.com lines.

**Headlines**

- Use sentence case, and keep them short: about three to six words.
- Headlines often end with a period, even when they are fragments.

**Patterns**

| Pattern | Example |
|---|---|
| Two-beat parallel tagline | "Quieter than ever. Finer than before." |
| Label, then headline | "Battery" / "All week on one charge." |
| Wordplay tied to a real benefit, used sparingly | "Light work." for a lightweight tool |
| Specifics over adjectives | "Grinds 18 grams in 9 seconds.¹" |

**Rules**

- Every number has a unit and a baseline, and every claim gets a footnote.
- Hype words get a number behind them or get cut.
- Address the reader as "you" and talk about what they can do, not what the product "boasts".
- Section intros are 17–21px, two to four sentences.

**CTAs:** short verbs, such as Learn more, Buy, Shop [category], Compare models, Watch the film. One primary per block.

**Naming**

- Keep your product name consistent, and never set it in all caps.
- When mentioning Apple products, follow Apple's naming: singular, "iPhone" with a lowercase i even at the start of a sentence, no "the" before Apple Watch or Apple Vision Pro, no trademark symbols in headlines.
- Phrase it referentially: "works with iPhone".

## 14. Footnotes and footer

**Footnote markers**

- Inline `<sup>` links to `#footnote-N`. Markers are numbers or *, **, ◊, §.
- Size .6em, raised .5em. Inside cards, give each marker a 44px tap target.
- The footnote text lives in the footer's legal block.
- CSS: `sup.footnote` and its link color are in web-implementation.md §10; add `class="hit-expand"` to the link for the tap target.

**Footer**

- Background #f5f5f7, max 980px content with 22px padding. Match the measure your nav and sections use (980px with the classic container, otherwise `--content`).
- Type is 12px / 1.3333 / -0.01em throughout.
- Text rgba(0,0,0,.56), links rgba(0,0,0,.72), headings rgba(0,0,0,.88), borders rgba(0,0,0,.16). The CSS below maps these to tokens so the footer follows dark mode.

**Footer order**

1. Legal notes: padding 17px 0 11px, a bottom border, underlined links.
2. Directory columns, which collapse to accordions at ≤833.
3. A "more ways to buy" line with a #0066cc underlined link.
4. Copyright and legal links.

```css
.footer { background: var(--bg-alt); color: var(--text-2); font-size: .75rem; line-height: 1.3333; letter-spacing: -.01em; }
.footer__inner { max-width: 980px; margin-inline: auto; padding-inline: 22px; }
@media (max-width: 833px) { .footer__inner { padding-inline: 16px; } }
.footer__notes { padding: 17px 0 11px; border-bottom: 1px solid var(--hairline); }
.footer a { color: var(--text); } .footer__notes a { text-decoration: underline; }
.footer h3 { color: var(--text); font-size: inherit; font-weight: 600; }
```

## 15. Section recipes

Each recipe is one idea. Pick the few the page actually needs.

1. **Hero:** eyebrow (product name) → headline → one-line subhead → CTA pair → large media.
2. **Lineup or compare:** section header (headline + "Compare" link) → row of product tiles (swatches, name, tagline, price, CTA pair) on the alt background.
3. **Film:** short headline → 16:9 video with a visible play/pause control → optional text link.
4. **Feature gallery:** section header → horizontal gallery of feature cards (label, headline, image, "+" for detail modal) → paddles and dots.
5. **Why buy here:** a short gallery or grid of service cards: delivery, trade-in, support, payment. Each has a label, a one-sentence benefit and a text link.
6. **Spec callouts:** a grid of three or four facts, each a small label, a large number with a unit, and one line of explanation with a footnote.
7. **Works with:** an image accordion or tabs. Each item shows one related product or integration with a short explanation.
8. **Essentials:** a 2-up or 3-up card grid of accessories or add-ons, each with an image, name and one link.
9. **Closing CTA:** one headline, one sentence, one or two buttons, plenty of space. Then the index of links, then the footer.
10. **Static banner:** product name or eyebrow, headline at hero scale, one line of support, the product isolated on a plain field, one CTA. Leave at least a third of the canvas empty (about; tune by eye). When rendering it from HTML to an image or PDF, set Inter or the brand font explicitly instead of the system stack, so SF never ends up in the artwork.

## 16. Staying original

- **Borrow the system, not the site.** Take the proportions, rhythm and restraint. Use your own wordmark, copy, imagery, iconography (open-licensed sets, not SF Symbols) and your brand's color.
- **Where the line is.** Use one nav bar, not Apple's global-plus-local pair, unless the site really has a product hierarchy. Don't reproduce Apple's section sequence (§1); pick sections from §15 by need. Don't copy Apple's chapter-nav icon row, footer directory or "more ways to buy" line.
- **Fonts and images:** no SF font files or SF font names in stacks, no system stack in rendered banners or PDFs, and no images, icons or video from apple.com.
- **No endorsement:** don't use the Apple logo, and nothing on the page should suggest Apple endorses or sponsors it.
- **App Store badge:** use only Apple's badge artwork, unmodified and unanimated, at least 40px tall, with clear space of a quarter of its height, one per layout, in a subordinate position.
- **Credit line:** if the page mentions Apple trademarks and has a legal notice area, add a credit line there, for example "iPhone is a trademark of Apple Inc., registered in the U.S. and other countries."
