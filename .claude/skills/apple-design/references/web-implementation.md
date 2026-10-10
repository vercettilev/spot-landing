# Web implementation

Paste-ready CSS for Apple-style pages and app UI on the web. Apple's own production values are marked as such. Values marked "about" are stylistic choices, not Apple numbers. Browser support is from MDN browser-compat-data as of October 2026.

## Contents

1. Ground rules
2. Font stack and base styles
3. Tokens (light, dark, increased contrast)
4. Type classes
5. Tailwind
6. Glass recipe
7. Continuous and concentric corners
8. Motion: easings, springs, reveal
9. Accessibility media queries
10. Components
11. Minimal page skeleton

## 1. Ground rules

- **Container:** if another skill or the project dictates the page container (an artifact contract, a framework layout, required theme hooks), follow it and put these tokens inside it.
- **Brand first:** if the project has a brand, map its colors onto the accent and link tokens (§3, Brand mapping) and the content layer, and keep its fonts. Use the neutral tokens only where the brand has none.
- **Single source:** this file is the only home for shared CSS (tokens, type, glass, buttons, cards, layout, reveal). marketing-pages.md adds only page-specific components built on these tokens.
- **Text sizing:** keep the root font size at 100% and size text in rem. Apple's own site sets `html { font-size: 106.25% }`; don't copy that, because a fixed root fights user settings and zoom. In rem, 17px is 1.0625rem.
- **Fonts:** no SF font files, no `@font-face` for SF, New York or SF Mono, and no "SF Pro …" names in stacks.
- **Icons:** no SF Symbols on the web. Use Lucide, Phosphor or Heroicons.

## 2. Font stack and base styles

```css
:root {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial,
               sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
  --font-serif: ui-serif, Georgia, Cambria, "Times New Roman", Times, serif;   /* ui-serif = New York in Safari */
  --font-mono: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
  --font-rounded: ui-rounded, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; /* rounded only in Safari */
}

*, *::before, *::after { box-sizing: border-box; }
html {
  -webkit-text-size-adjust: 100%; text-size-adjust: 100%;   /* 100%, never none */
  background: var(--bg);   /* Safari 26 reportedly tints its toolbar from this, not theme-color */
}
body {
  margin: 0; min-width: 320px;
  font-family: var(--font-sans); font-size: 1.0625rem; line-height: 1.4705882; letter-spacing: -.022em;
  font-weight: 400; color: var(--text); background: var(--bg);
  font-synthesis: none; font-feature-settings: "kern";
  -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;
}
h1, h2, h3, h4, p, figure { margin: 0; }   /* spacing comes from the rules in §10, not browser defaults */
strong, b { font-weight: 600; }   /* the browser's "bolder" turns a 600 headline into 900 and body into 700 */
button, input, select, textarea { font: inherit; letter-spacing: inherit; }
```

**Why this stack**

- `-apple-system` and `BlinkMacSystemFont` give SF on Apple devices without shipping it. The rest is the Tailwind 4.3 `--font-sans` stack.
- It leads with explicit platform fonts instead of `system-ui` so CJK text respects `lang` on Windows. If you prefer `system-ui`, accept that caveat.
- `ui-serif`, `ui-monospace` and `ui-rounded` work only in Safari; the fallbacks cover other browsers.
- With `font-synthesis: none`, a weight the font doesn't ship renders at the nearest one it has, so load 600 (or the nearest) for any web or brand font.

**Inter for non-Apple devices.** Inter (SIL OFL, self-hostable, variable weights 100–900, `opsz` axis 14–32) is close in spirit, but its metrics differ: the x-height is taller. Insert it after `BlinkMacSystemFont` and keep the rest of the stack:

```css
--font-sans: -apple-system, BlinkMacSystemFont, InterVariable, Inter, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial,
             sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
```

Inter applies only if you ship it: self-host it with `@font-face`, or embed it in a self-contained file. Otherwise leave it out, because most non-Apple visitors don't have it installed and get Segoe UI, Roboto or Arial anyway. For banners and PDFs rendered from HTML, drop `-apple-system` and `BlinkMacSystemFont` and name Inter or the brand font first, so SF never ends up in the artwork.

**Tracking**

- Native apps adjust SF tracking automatically. On the web, set `letter-spacing` per size (§4).
- Whether Safari applies SF's automatic tracking to `-apple-system` text is unverified, so setting it explicitly is the safe choice.

## 3. Tokens (light, dark, increased contrast)

```css
:root {
  color-scheme: light dark;

  /* Neutrals (apple.com sitekit) */
  --bg: #fff;            --bg-alt: #f5f5f7;     --surface: #fafafc;
  --text: #1d1d1f;       --text-2: #6e6e73;     --text-3: #86868b;   /* text-3: large or non-essential text only */
  --hairline: rgb(0 0 0 / .16);
  --link: #0066cc;
  --accent: #0071e3;     --accent-hover: #0077ed; --accent-active: #006edb; --on-accent: #fff;
  --focus: #0071e3;
  --neutral-btn: #1d1d1f; --neutral-btn-hover: #272729; --on-neutral: #fff;
  --control-scrim: rgb(210 210 215 / .64); --control-icon: rgb(0 0 0 / .56);
  --badge-text: #b64400; --badge-bg: rgb(245 99 0 / .1);
  --success: #008009;    --danger: #e30000;

  /* iOS system colors (app mode) */
  --sys-blue: #0088ff;   --sys-green: #34c759;  --sys-red: #ff383c;    --sys-orange: #ff8d28;
  --sys-yellow: #ffcc00; --sys-teal: #00c3d0;   --sys-indigo: #6155f5; --sys-pink: #ff2d55;
  --sys-gray: #8e8e93;   --sys-gray3: #c7c7cc;  --sys-gray5: #e5e5ea;  --sys-gray6: #f2f2f7;
  /* about: third-party, pre-iOS 26 values */
  --sys-grouped-bg: #f2f2f7; --sys-grouped-cell: #fff;
  --sys-label-2: rgb(60 60 67 / .6); --sys-label-3: rgb(60 60 67 / .3); --sys-separator: rgb(60 60 67 / .29);

  /* Glass: Apple's nav values; edge, highlight and shadow are about */
  --glass-bg: rgb(250 250 252 / .8);  --glass-bg-fallback: rgb(250 250 252 / .92);
  --glass-bg-solid: rgb(250 250 252 / .97);
  --glass-filter: saturate(180%) blur(20px);
  --glass-edge: rgb(0 0 0 / .08); --glass-highlight: rgb(255 255 255 / .6);
  --glass-shadow: 0 8px 24px rgb(0 0 0 / .12);

  /* Layout */
  --content: 1260px; --section-pad: 160px; --section-pad-dense: 112px; --header-gap: 80px;
  --gutter-card: 20px; --seam: 12px; --nav-h: 44px; --localnav-h: 52px;

  /* Radii */
  --r-pill: 980px; --r-card: 28px; --r-tile: 18px; --r-block: 8px; --r-badge: 6px;

  /* Motion */
  --ease: cubic-bezier(.4, 0, .6, 1);         /* Apple web default */
  --ease-out: cubic-bezier(0, 0, .5, 1);      /* card hover */
  --ease-nav: cubic-bezier(.28, .11, .32, 1); /* local nav stuck state */
  --dur-fast: .24s; --dur: .32s; --dur-hover: .3s;
}
@media (max-width: 1068px) { :root { --section-pad: 128px; --section-pad-dense: 96px; --header-gap: 64px; } }
@media (max-width: 734px)  { :root { --section-pad: 96px;  --section-pad-dense: 56px; --header-gap: 48px; --content: 420px; } } /* 420px is Apple's; widen if needed */
@media (max-width: 833px)  { :root { --nav-h: 48px; } }

/* Dark: system preference, unless the page forces light */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #000; --bg-alt: #1d1d1f; --surface: #161617;
    --text: #f5f5f7; --text-2: #86868b; --text-3: #6e6e73;
    --hairline: rgb(255 255 255 / .24); --link: var(--link-dark, #2997ff);   /* brand: set --link-dark */
    --neutral-btn: #f5f5f7; --neutral-btn-hover: #e8e8ed; --on-neutral: #000;   /* hover: about */
    --control-scrim: rgb(66 66 69 / .72); --control-icon: rgb(255 255 255 / .8);
    --badge-text: #ff791b; --badge-bg: rgb(245 99 0 / .2);
    --success: #30d158; --danger: #ff4245;               /* iOS dark system values */
    --sys-blue: #0091ff; --sys-green: #30d158; --sys-red: #ff4245; --sys-orange: #ff9230;
    --sys-yellow: #ffd600; --sys-teal: #00d2e0; --sys-indigo: #6d7cff; --sys-pink: #ff375f;
    --sys-gray3: #48484a; --sys-gray5: #2c2c2e; --sys-gray6: #1c1c1e;
    --sys-grouped-bg: #000; --sys-grouped-cell: #1c1c1e;
    --sys-label-2: rgb(235 235 245 / .6); --sys-label-3: rgb(235 235 245 / .3); --sys-separator: rgb(84 84 88 / .6);
    --glass-bg: rgb(22 22 23 / .8); --glass-bg-fallback: rgb(22 22 23 / .88); --glass-bg-solid: rgb(22 22 23 / .97);
    --glass-edge: rgb(255 255 255 / .1); --glass-highlight: rgb(255 255 255 / .12);
    --glass-shadow: 0 8px 24px rgb(0 0 0 / .4);
  }
}
/* Dark: explicit toggle. Repeat the same declarations as above. */
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg: #000; --bg-alt: #1d1d1f; --surface: #161617;
  --text: #f5f5f7; --text-2: #86868b; --text-3: #6e6e73;
  --hairline: rgb(255 255 255 / .24); --link: var(--link-dark, #2997ff);
  --neutral-btn: #f5f5f7; --neutral-btn-hover: #e8e8ed; --on-neutral: #000;
  --control-scrim: rgb(66 66 69 / .72); --control-icon: rgb(255 255 255 / .8);
  --badge-text: #ff791b; --badge-bg: rgb(245 99 0 / .2);
  --success: #30d158; --danger: #ff4245;
  --sys-blue: #0091ff; --sys-green: #30d158; --sys-red: #ff4245; --sys-orange: #ff9230;
  --sys-yellow: #ffd600; --sys-teal: #00d2e0; --sys-indigo: #6d7cff; --sys-pink: #ff375f;
  --sys-gray3: #48484a; --sys-gray5: #2c2c2e; --sys-gray6: #1c1c1e;
  --sys-grouped-bg: #000; --sys-grouped-cell: #1c1c1e;
  --sys-label-2: rgb(235 235 245 / .6); --sys-label-3: rgb(235 235 245 / .3); --sys-separator: rgb(84 84 88 / .6);
  --glass-bg: rgb(22 22 23 / .8); --glass-bg-fallback: rgb(22 22 23 / .88); --glass-bg-solid: rgb(22 22 23 / .97);
  --glass-edge: rgb(255 255 255 / .1); --glass-highlight: rgb(255 255 255 / .12);
  --glass-shadow: 0 8px 24px rgb(0 0 0 / .4);
}
:root[data-theme="light"] { color-scheme: light; }

/* Increase Contrast. Safari supports prefers-contrast; it does not support prefers-reduced-transparency. */
@media (prefers-contrast: more) {
  :root { --text-2: #424245; --text-3: #6e6e73; --hairline: rgb(0 0 0 / .5);
          --sys-blue: #1e6ef4; --sys-green: #008932; --sys-red: #e9152d; --sys-orange: #c55300; }
}
@media (prefers-contrast: more) and (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { --text-2: #d2d2d7; --text-3: #86868b; --hairline: rgb(255 255 255 / .5);
          --sys-blue: #5cb8ff; --sys-green: #4ad968; --sys-red: #ff6165; --sys-orange: #ffa056; }
}
@media (prefers-contrast: more) {   /* same values for the explicit dark toggle on a light-mode OS */
  :root[data-theme="dark"] { --text-2: #d2d2d7; --text-3: #86868b; --hairline: rgb(255 255 255 / .5);
          --sys-blue: #5cb8ff; --sys-green: #4ad968; --sys-red: #ff6165; --sys-orange: #ffa056; }
}

/* A dark section inside a light page: re-scope the dark tokens on the section itself */
.section--dark {
  color-scheme: dark; background: var(--bg); color: var(--text);
  --bg: #000; --bg-alt: #1d1d1f; --surface: #161617;
  --text: #f5f5f7; --text-2: #86868b; --text-3: #6e6e73;
  --hairline: rgb(255 255 255 / .24); --link: var(--link-dark, #2997ff);
  --neutral-btn: #f5f5f7; --neutral-btn-hover: #e8e8ed; --on-neutral: #000;
  --control-scrim: rgb(66 66 69 / .72); --control-icon: rgb(255 255 255 / .8);
}
@media (prefers-contrast: more) {
  .section--dark { --text-2: #d2d2d7; --text-3: #86868b; --hairline: rgb(255 255 255 / .5); }
}
```

**Dark sections.** In dark mode the page is #000 too, so a `.section--dark` merges with plain neighbors. Put `.section--alt` (#f5f5f7 light, #1d1d1f dark) on the sections next to it.

**Brand mapping.** Replace `--accent`, `--accent-hover`, `--accent-active`, `--on-accent`, `--link` and `--focus` with brand values, and set `--link-dark` on `:root` to the brand's dark-mode link shade; both dark blocks and `.section--dark` read it. Leave the neutrals alone unless the brand defines its own.

- Every label on the accent reaches 4.5:1 in every state. Apple's own hover (#0077ed) is only about 4.3:1 with white, so for a brand near the limit make hover and active darker, not lighter.
- If white fails on the exact brand color, darken the fill or set `--on-accent` to near-black. For example, white on #fc4e02 is about 3.4:1 and #1d1d1f on it is about 5.0:1. For a light brand (yellow, lime), the dark label is usually the better choice.
- `--link-dark` must reach 4.5:1 on #000 and #1d1d1f, and `--focus` 3:1 against the light and dark backgrounds; if one focus shade can't do both, add `--focus` to the dark blocks.

**Compact alternative.** `light-dark()` (Chrome 123, Firefox 120, Safari 17.5) lets each token hold both values, for example `--text: light-dark(#1d1d1f, #f5f5f7)`. Drive it with `color-scheme` on `:root`. Use it only if older Safari doesn't matter.

**Contrast notes** (WCAG 2, computed)

- #0071e3 with white text is about 4.7:1, so it passes. Its hover #0077ed is about 4.3:1, which passes only for large text.
- #0088ff with white is about 3.5:1, so use it only behind WCAG large text (at least 24px, or 18.66px bold).
- #86868b on white is about 3.6:1, so keep `--text-3` for large or non-essential text.
- #6e6e73 on black is about 4.1:1, so in dark mode `--text-3` has the same limit.

## 4. Type classes

Marketing scale, from apple.com's type ramp, converted to rem.

```css
.t-hero, .t-section, .t-headline, .t-tile, .t-card, .t-eyebrow, .t-label { font-weight: 600; }
.t-hero     { font-size: 5rem;      line-height: 1.05;      letter-spacing: -.015em; }
.t-section  { font-size: 3.5rem;    line-height: 1.0714286; letter-spacing: -.005em; }
.t-headline { font-size: 3rem;      line-height: 1.0834933; letter-spacing: -.003em; }
.t-tile     { font-size: 2.5rem;    line-height: 1.1;       letter-spacing: 0; }
.t-card     { font-size: 1.75rem;   line-height: 1.1428571; letter-spacing: .007em; }
.t-eyebrow  { font-size: 1.5rem;    line-height: 1.1666667; letter-spacing: .009em; }
.t-intro    { font-size: 1.3125rem; line-height: 1.381002;  letter-spacing: .011em; font-weight: 400; }
.t-label    { font-size: 1.0625rem; line-height: 1.2353641; letter-spacing: -.022em; }
.t-body     { font-size: 1.0625rem; line-height: 1.4705882; letter-spacing: -.022em; }
.t-caption  { font-size: .75rem;    line-height: 1.3333733; letter-spacing: -.01em; }
@media (max-width: 1068px) {
  .t-hero     { font-size: 4rem;      line-height: 1.0625;    letter-spacing: -.009em; }
  .t-section  { font-size: 3rem;      line-height: 1.0834933; letter-spacing: -.003em; }
  .t-headline { font-size: 2.5rem;    line-height: 1.1;       letter-spacing: 0; }
  .t-tile     { font-size: 2rem;      line-height: 1.125;     letter-spacing: .004em; }
  .t-card     { font-size: 1.5rem;    line-height: 1.1666667; letter-spacing: .009em; }
  .t-eyebrow  { font-size: 1.3125rem; line-height: 1.1904762; letter-spacing: .011em; }
  .t-label    { font-size: .875rem;   line-height: 1.2857743; letter-spacing: -.016em; }
}
@media (max-width: 734px) {
  .t-hero     { font-size: 3rem;      line-height: 1.0834933; letter-spacing: -.003em; }
  .t-section  { font-size: 1.75rem;   line-height: 1.1428571; letter-spacing: .007em; }
  .t-headline { font-size: 2rem;      line-height: 1.125;     letter-spacing: .004em; }
  .t-tile     { font-size: 1.75rem;   line-height: 1.1428571; letter-spacing: .007em; }
  .t-card     { font-size: 1.3125rem; line-height: 1.1904762; letter-spacing: .011em; }
  .t-intro    { font-size: 1.1875rem; line-height: 1.4211026; letter-spacing: .012em; }
}
.text-2 { color: var(--text-2); }
.text-3 { color: var(--text-3); }
```

App scale: iOS text styles at the default size, with HIG tracking.

```css
.ios-large-title, .ios-title-1, .ios-title-2, .ios-title-3, .ios-body, .ios-callout, .ios-subhead,
.ios-footnote, .ios-caption-1, .ios-caption-2 { font-weight: 400; }   /* keeps h1–h3 from going bold */
.ios-large-title { font-size: 2.125rem;  line-height: 1.2059; letter-spacing: .012em; }
.ios-title-1     { font-size: 1.75rem;   line-height: 1.2143; letter-spacing: .014em; }
.ios-title-2     { font-size: 1.375rem;  line-height: 1.2727; letter-spacing: -.012em; }
.ios-title-3     { font-size: 1.25rem;   line-height: 1.25;   letter-spacing: -.023em; }
.ios-headline    { font-size: 1.0625rem; line-height: 1.2941; letter-spacing: -.026em; font-weight: 600; }
.ios-body        { font-size: 1.0625rem; line-height: 1.2941; letter-spacing: -.026em; }
.ios-callout     { font-size: 1rem;      line-height: 1.3125; letter-spacing: -.02em; }
.ios-subhead     { font-size: .9375rem;  line-height: 1.3333; letter-spacing: -.016em; }
.ios-footnote    { font-size: .8125rem;  line-height: 1.3846; letter-spacing: -.006em; }
.ios-caption-1   { font-size: .75rem;    line-height: 1.3333; letter-spacing: 0; }
.ios-caption-2   { font-size: .6875rem;  line-height: 1.1818; letter-spacing: .006em; }
.ios-emphasized  { font-weight: 600; }
.ios-large-title.ios-emphasized, .ios-title-1.ios-emphasized, .ios-title-2.ios-emphasized { font-weight: 700; }
```

iOS leading is tight because it is tuned for rows. For paragraphs of three or more lines, loosen it (body copy at about 1.47).

## 5. Tailwind

Tailwind v4: define tokens in `@theme` and point colors at the switching variables with `@theme inline`, so dark mode comes from §3 and needs no `dark:` variants.

```css
@import "tailwindcss";

@theme {
  --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial,
               sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";   /* identical to §2 */
  --text-hero: 5rem;      --text-hero--line-height: 1.05;      --text-hero--letter-spacing: -0.015em; --text-hero--font-weight: 600;
  --text-section: 3.5rem; --text-section--line-height: 1.0714; --text-section--letter-spacing: -0.005em; --text-section--font-weight: 600;
  --text-body: 1.0625rem; --text-body--line-height: 1.4706;    --text-body--letter-spacing: -0.022em;
  --radius-card: 28px;  --radius-pill: 980px;
  --ease-apple: cubic-bezier(.4, 0, .6, 1);
}
@theme inline {
  --color-ink: var(--text);  --color-ink-2: var(--text-2); --color-ink-3: var(--text-3);
  --color-canvas: var(--bg); --color-canvas-alt: var(--bg-alt); --color-surface: var(--surface);
  --color-accent: var(--accent); --color-link: var(--link); --color-hairline: var(--hairline);
}
/* paste the §3 :root token blocks and the §4 classes (inside @layer components) below */
```

**Using it**

- Utilities read `text-hero`, `bg-canvas-alt`, `text-ink-2`, `rounded-card`, `ease-apple`.
- Tailwind breakpoints are min-width and Apple's are max-width (734 and 1068), so the §4 classes are simpler than juggling three responsive utilities per heading.

**Tailwind v3:** put the same values in `theme.extend` of the config file. For example, set `fontSize.hero` to `['5rem', { lineHeight: '1.05', letterSpacing: '-0.015em', fontWeight: '600' }]` and `colors.ink` to `'var(--text)'`.

## 6. Glass recipe

Apple's production nav recipe is the base (§3 tokens). The extras handle floating controls and accessibility.

```css
.glass {
  background: var(--glass-bg-fallback);
  border: 1px solid var(--glass-edge);
}
@supports ((-webkit-backdrop-filter: initial) or (backdrop-filter: initial)) {
  .glass {
    background: var(--glass-bg);
    -webkit-backdrop-filter: var(--glass-filter);
    backdrop-filter: var(--glass-filter);
  }
}
/* Bars flush to an edge: drop the side borders and keep only a keyline */
.glass--bar { border-width: 0 0 1px; }
/* Floating controls (tab bar, toolbar pill, FAB): capsule plus the 2026 look of
   a darker edge and a bright top highlight. All values here are about. */
.glass--float {
  border-radius: var(--r-pill);
  box-shadow: inset 0 1px 0 var(--glass-highlight), var(--glass-shadow);
}

@media (prefers-reduced-transparency: reduce) {           /* Chrome/Edge 118+, not Safari */
  .glass { background: var(--glass-bg-solid); -webkit-backdrop-filter: none; backdrop-filter: none; }
}
@media (prefers-contrast: more) {                          /* Safari 14.1+, Chrome, Firefox */
  .glass { background: var(--bg); border-color: var(--text); -webkit-backdrop-filter: none; backdrop-filter: none; }
}
@media (forced-colors: active) {
  .glass { background: Canvas; border: 1px solid CanvasText; -webkit-backdrop-filter: none; backdrop-filter: none; }
}
```

**Clear glass over media**

- The HIG says to add a 35% dark dimming layer over bright content.
- That is not enough for small white text on the web: white on black at 35% over pure white is only about 2.4:1.
- Add a stronger scrim or an opaque backing where text sits on clear glass.

```css
.glass-clear { background: rgb(0 0 0 / .35); -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); color: #fff; } /* blur: about */
.glass-clear--text { background: rgb(0 0 0 / .6); }   /* about; meets 4.5:1 for white text over white media */
```

Black at 0.6 over white gives white text about 5.7:1.

**Minimum alpha for text on glass** (worst case: a flat black or white backdrop, no blur brightening)

| Glass fill | Text | Worst backdrop | 3:1 | 4.5:1 | 7:1 |
|---|---|---|---|---|---|
| rgb(250,250,252) | #1d1d1f | black | 0.41 | 0.53 | 0.67 |
| white | #000 | black | 0.35 | 0.46 | 0.58 |
| rgb(22,22,23) | #fff | white | 0.46 | 0.59 | 0.71 |
| rgb(29,29,31) | #f5f5f7 | white | 0.50 | 0.63 | 0.76 |

Apple's 0.8 nav passes easily for neutral text: about 10.1:1 light and 8.9:1 dark (#f5f5f7 text) in the worst case. Safari ignores `prefers-reduced-transparency`, so never rely on it to fix contrast; keep base alphas above these floors.

Colored text and marks do much worse. At 0.8, #0066cc drops to about 3.3:1 over black content and #2997ff to about 3.2:1 over white, so colored labels in a bar need about 0.93 (light) and 0.9 (dark) alpha; `--glass-bg-solid` (0.97) clears both. A colored logo or accent pill can vanish when brand-colored content scrolls under the bar: use the brand's monochrome logo in `var(--text)`, and check the pill's edge at 3:1 against the glass over the worst backdrop.

**Gotchas**

- **Prefix:** always ship `-webkit-backdrop-filter` too. Safari supports the unprefixed property only from 18.
- **Backdrop root.** A blur samples only up to the nearest backdrop root. An ancestor with `filter`, `opacity < 1`, `mask`, `clip-path`, another `backdrop-filter`, `mix-blend-mode`, or `will-change` naming one of these makes the glass look broken.
- **Containing block.** `backdrop-filter` makes the element the containing block for `position: fixed` and `position: absolute` descendants. A fixed dropdown or modal inside a glass header gets clipped and positioned relative to the header, so portal overlays out of it.
- **Performance:** keep no more than about three blurred surfaces on screen at once, and avoid blurring over constantly animating content. Apple's native guidance is the same: limit simultaneous glass effects.
- **Refraction:** "liquid" refraction with `backdrop-filter: url(#svg)` and feDisplacementMap works only in Chromium. Treat it as optional decoration on top of plain blur, never as the base.
- **Where glass goes:** the functional layer only: nav bars, toolbars, tab bars, sidebars, sheets, popovers, menus and floating controls. Cards and content stay opaque on the web (`--bg-alt` or `--surface`). Never put glass on glass.

## 7. Continuous and concentric corners

**Squircle via `corner-shape`** (Chrome and Edge 139+; Firefox and Safari preview only)

- Use it as progressive enhancement.
- `squircle` is `superellipse(2)`, not Apple's exact curve, and it looks smaller at the same radius. Raise the radius by eye; about 1.5× is a starting point.

```css
.card { border-radius: var(--r-card); }
@supports (corner-shape: squircle) {
  .card { corner-shape: squircle; border-radius: calc(var(--r-card) * 1.5); }
}
```

**Cross-browser squircle** with `figma-squircle` (MIT). Figma's "iOS" preset is 60% smoothing; that is Figma's number, not Apple's.

```js
import { getSvgPath } from 'figma-squircle';
const ro = new ResizeObserver(() => {
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.clipPath = `path('${getSvgPath({ width: w, height: h, cornerRadius: 28, cornerSmoothing: 0.6 })}')`;
});
ro.observe(el);
```

Clipping removes `box-shadow` and the focus outline. Put any `filter: drop-shadow()` and the focus ring on a wrapper. A clip-path also creates a backdrop root (§6). `clip-path: shape()` (Chrome 135, Firefox 148, Safari 18.4) accepts responsive units if you'd rather build the path yourself. Avoid Houdini `paint()`, which is Chrome-only.

**Concentric nesting:** inner radius = outer radius − padding, with a floor so it never collapses to square. This is the web version of SwiftUI's `.concentric(minimum:)`.

```css
.shell { --r: var(--r-card); --pad: 12px; border-radius: var(--r); padding: var(--pad); }
.shell > * { border-radius: max(var(--r) - var(--pad), 8px); }   /* 8px floor: about */
```

For a capsule inside a capsule, both use `--r-pill`.

## 8. Motion: easings, springs, reveal

`linear()` springs (Chrome 113, Firefox 112, Safari 17.2) are computed from SwiftUI's spring model and settle within 0.1%. Apple doesn't publish them. Use them for sheets, menus, toggles and morphs. Keep the plain eases for color and opacity.

```css
:root {
  --spring-smooth: var(--ease); --spring-smooth-dur: .5s;   /* fallbacks */
  --spring-snappy: var(--ease); --spring-snappy-dur: .5s;
  --spring-bouncy: var(--ease); --spring-bouncy-dur: .5s;
}
@supports (transition-timing-function: linear(0, 1)) {
  :root {
    --spring-smooth-dur: .74s;
    --spring-smooth: linear(0, 0.005 1.2%, 0.020 2.3%, 0.046 3.7%, 0.080 5%, 0.160 7.7%, 0.363 13.7%, 0.464 16.8%, 0.559 20.2%, 0.638 23.3%, 0.709 26.7%, 0.767 30%, 0.817 33.5%, 0.861 37.3%, 0.900 41.8%, 0.930 46.7%, 0.954 52.2%, 0.972 58.3%, 0.984 65.2%, 0.992 73.5%, 1);
    --spring-snappy-dur: .7s;
    --spring-snappy: linear(0, 0.006 1.3%, 0.024 2.7%, 0.055 4.2%, 0.094 5.7%, 0.189 8.7%, 0.413 15%, 0.514 18%, 0.610 21.2%, 0.694 24.3%, 0.765 27.5%, 0.824 30.7%, 0.873 34%, 0.914 37.5%, 0.946 41.3%, 0.971 45.5%, 0.988 50.2%, 1.000 55.7%, 1.006 67.7%, 1);
    --spring-bouncy-dur: .82s;
    --spring-bouncy: linear(0, 0.007 1.2%, 0.026 2.3%, 0.060 3.7%, 0.110 5.2%, 0.155 6.3%, 0.220 7.8%, 0.476 13.3%, 0.594 16%, 0.699 18.7%, 0.784 21.2%, 0.860 23.8%, 0.920 26.5%, 0.969 29.3%, 1.003 32.2%, 1.022 34.5%, 1.036 37%, 1.043 39.7%, 1.046 42.8%, 1.041 48%, 1.012 62.5%, 1.003 70.3%, 0.998 82.2%, 1);
  }
}

/* Movement only when the person hasn't asked for less */
@media (prefers-reduced-motion: no-preference) {
  .sheet { transition: transform var(--spring-smooth-dur) var(--spring-smooth); }
  .js .reveal {
    opacity: 0; transform: translateY(30px);
    transition: opacity .9s var(--ease), transform .7s var(--ease);
    transition-delay: calc(var(--i, 0) * .15s);
  }
  .js .reveal.is-in { opacity: 1; transform: none; }
}
@media (prefers-reduced-motion: reduce) {
  .sheet { transition: opacity var(--dur-fast) var(--ease); }   /* fade instead of slide */
}
@media print { .js .reveal { opacity: 1; transform: none; } }
```

The reveal script. It adds `js` first, so content stays visible if the script never runs; the stagger cycles every three items.

```js
document.documentElement.classList.add('js');
const io = new IntersectionObserver((entries) => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, { rootMargin: '0px 0px -10% 0px' });
document.querySelectorAll('.reveal').forEach((el, i) => { el.style.setProperty('--i', i % 3); io.observe(el); });
```

**Rules**

- Wrap movement in `no-preference` rather than adding a global kill switch, so the fallbacks stay fades.
- Never animate into or out of blur under reduced motion.
- Don't animate frequent interactions such as typing or every hover in a dense list.

## 9. Accessibility media queries

| Query | Chrome | Firefox | Safari | Use it for |
|---|---|---|---|---|
| `prefers-color-scheme` | 76 | 67 | 12.1 | dark tokens (§3) |
| `prefers-reduced-motion` | 74 | 63 | 10.1 | fades instead of movement (§8) |
| `prefers-contrast` | 96 | 101 | 14.1 | `more`: opaque glass, stronger grays and borders |
| `forced-colors` | 89 | 89 | 16 | system colors; real borders |
| `prefers-reduced-transparency` | 118 | flag only | no | solid glass where supported |
| `light-dark()` | 123 | 120 | 17.5 | compact tokens |

**Forced colors**

- `box-shadow` is forced to none, and backgrounds keep their original alpha.
- Give glass and cards a real `border` and an opaque `Canvas` background.
- Don't build a separate design for this mode.

**Text size**

- Use rem everywhere, including spacing that should grow with text. That meets the HIG's 200% target and WCAG 1.4.4.
- An optional iOS hook, `html { font: -apple-system-body }`, makes 1rem follow the iOS Text Size setting. It is WebKit-only and unverified in detail.
- If you use it, scope it to iOS, re-declare `font-family` afterward, and size body at 1rem. Desktop Safari resolves it to 13px.

**Focus, targets and labels**

```css
:where(a, button, input, select, textarea, [tabindex]):focus-visible {
  outline: 2px solid var(--focus); outline-offset: 3px;
}
.hit { min-width: 44px; min-height: 44px; }        /* HIG iOS default target */
/* A 44px tap area for a small control without changing its look: nav pills, paddles, footnote markers */
.hit-expand { position: relative; }               /* keep absolute or fixed if the element already has it */
.hit-expand::after { content: ""; position: absolute; left: 50%; top: 50%;
  width: max(100%, 44px); height: max(100%, 44px); transform: translate(-50%, -50%); }
.visually-hidden, .skip-link:not(:focus) {
  position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap;
}
```

- Expanded areas must not overlap. Gallery dots 8px wide and 24px apart can't each get 44px, so keep the paddles as the main control there; the dots still meet WCAG 2.5.8's 24px spacing rule.
- Label icon-only buttons with `aria-label` and hide decorative icons with `aria-hidden="true"`.
- Don't autoplay video without a visible pause control. Caption films (`<track kind="captions">`), and add an audio description or transcript when the visuals carry information. Hide muted decorative loops with `aria-hidden="true"` or give them a text alternative.

## 10. Components

```css
/* Layout */
.content { width: 87.5%; max-width: var(--content); margin-inline: auto; }
.section { padding-block: var(--section-pad); }
.section--dense { padding-block: var(--section-pad-dense); }
.section--alt { background: var(--bg-alt); }   /* .section--dark is in §3 */
.section-header { display: flex; justify-content: space-between; align-items: baseline; column-gap: 120px; padding-bottom: var(--header-gap); }
@media (max-width: 734px) { .section-header { flex-direction: column; row-gap: .75rem; } } /* row-gap: about */
/* Eyebrow → headline → intro stack, and label → card headline; values are about */
.t-eyebrow + :is(.t-hero, .t-section, .t-headline) { margin-top: .5rem; }
:is(.t-hero, .t-section, .t-headline) + .t-intro { margin-top: 1.25rem; }
.t-label + .t-card { margin-top: .5rem; }

/* Buttons: capsule; padding values exclude the 1px border */
.btn { display: inline-flex; align-items: center; justify-content: center; min-width: 60px; padding: 8px 15px;
  border: 1px solid transparent; border-radius: var(--r-pill); font: 400 .875rem/1.2858 var(--font-sans);
  letter-spacing: -.016em; text-decoration: none; color: var(--on-accent); background: var(--accent); cursor: pointer;
  transition: background-color var(--dur-fast) var(--ease), color var(--dur) var(--ease); }
.btn:hover { background: var(--accent-hover); } .btn:active { background: var(--accent-active); }
.btn--elevated { padding: 11px 21px; font-size: 1.0625rem; line-height: 1.1765; letter-spacing: -.022em; }
.btn--super { padding: 17px 30px; font-size: 1.0625rem; line-height: 1.1765; letter-spacing: -.022em; }
.btn--reduced { min-width: 45px; padding: 3px 10px; font-size: .75rem; line-height: 1.3333; letter-spacing: -.01em; } /* about 24px tall: add .hit-expand */
.btn--secondary { background: transparent; color: var(--link); border-color: currentColor; }
.btn--secondary:hover { background: var(--accent-hover); color: var(--on-accent); border-color: transparent; }
.btn--neutral { color: var(--on-neutral); background: var(--neutral-btn); }   /* over media */
.btn--neutral:hover, .btn--neutral:active { background: var(--neutral-btn-hover); }
.btn--block { display: flex; width: 100%; border-radius: var(--r-block); }
.cta-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 1rem; margin-top: 2rem; } /* about */
.more { color: var(--link); text-decoration: none; } .more:hover { text-decoration: underline; }
.more::after { content: "›"; padding-inline-start: .24em; }

/* Cards: one radius, no shadow, flip background against the section */
.card { position: relative; border-radius: var(--r-card); overflow: hidden; padding: 28px; background: var(--bg-alt); }
.card--flush { padding: 0; }                   /* full-bleed media */
.section--alt .card { background: var(--bg); }
.badge { display: inline-block; padding: 6px 9px; border-radius: var(--r-badge); font-size: 1.0625rem; font-weight: 600;
  color: var(--badge-text); background: var(--badge-bg); }
sup.footnote { font-size: .6em; line-height: 1; position: relative; top: -.5em; vertical-align: baseline; }
sup.footnote a { color: var(--link); text-decoration: none; }   /* add class="hit-expand" for the tap area */

/* App mode: floating tab bar */
.tabbar { position: fixed; left: 50%; transform: translateX(-50%); bottom: calc(env(safe-area-inset-bottom) + 12px);
  display: flex; gap: 4px; padding: 4px;                         /* 12px and 4px: about */
  --glass-bg: var(--glass-bg-solid); }                           /* keeps colored 11px labels at 4.5:1 (§6) */
.tabbar a { display: grid; place-items: center; min-width: 64px; min-height: 48px; border-radius: var(--r-pill);
  font-size: .6875rem; color: var(--text); text-decoration: none; }       /* Caption 2 = the 11pt minimum */
.tabbar a[aria-current="page"] { color: var(--link); }   /* the accent's text shade, brand-mapped; pair with a filled icon */

/* App mode: inset grouped list */
.group-title { margin: 1.5rem 2rem .5rem; font-size: .8125rem; color: var(--sys-label-2); } /* title case; about */
.group { margin-inline: 1rem; border-radius: var(--r-tile); background: var(--sys-grouped-cell); overflow: hidden; } /* radius: about */
.row { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 11px 16px;
  font-size: 1.0625rem; letter-spacing: -.026em; }
.row + .row { border-top: 1px solid var(--sys-separator); }
```

Use the tab bar as `<nav class="tabbar glass glass--float">`. With `viewport-fit=cover` in the viewport meta, `env()` keeps it clear of the home indicator. The selected tab is `--link` text plus a filled icon, never `--sys-blue` (about 3.4:1 on light glass even over white). Check the 11px label at 4.5:1 against the bar over both a white and a black backdrop.

## 11. Minimal page skeleton

A marketing page with one sticky glass bar that turns translucent only once content scrolls under it, a hero, a card section and a footer. The brand ("Northwind") and the copy are placeholders; replace them with the project's own.

```html
<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="color-scheme" content="light dark">
  <title>Northwind Mill</title>
  <style>
    /* Paste §2, §3, §4, §6, §8, §9 and §10 here, then: */
    .nav { position: sticky; top: 0; z-index: 50; height: var(--nav-h); }
    .nav:not(.is-scrolled) { background: transparent; border-color: transparent;
      -webkit-backdrop-filter: none; backdrop-filter: none; }
    /* Nav and footer align to .content. Apple's use a 980px measure, which pairs with the classic 980px container. */
    .nav__inner { width: 87.5%; max-width: var(--content); height: 100%; margin-inline: auto;
      display: flex; align-items: center; gap: 8px; }
    .nav__brand { margin-right: auto; font-size: 1.3125rem; font-weight: 600; letter-spacing: .011em;
      color: var(--text); text-decoration: none; }   /* a logo here: monochrome, in var(--text) */
    .nav__link { display: inline-flex; align-items: center; min-height: 44px; padding-inline: 8px;
      font-size: .75rem; letter-spacing: -.01em; color: var(--text); opacity: .8; text-decoration: none; }
    .nav__link:hover { opacity: 1; }
    .nav .btn { margin-inline-start: 8px; }
    .hero { padding: 60px 0 var(--section-pad); text-align: center; }
    @media (max-width: 1068px) { .hero { padding-top: 40px; } }
    .hero .t-intro { max-width: 40rem; margin-inline: auto; }   /* about */
    .hero__media { margin-top: 3rem; aspect-ratio: 16 / 9; border-radius: var(--r-card); background: var(--bg-alt);
      display: grid; place-items: center; color: var(--text-3); }
    @media (max-width: 734px) { .hero__media { aspect-ratio: 4 / 5; } }   /* about: art-direct small screens */
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--gutter-card); }
    @media (max-width: 734px) { .grid-3 { grid-template-columns: 1fr; } }
    .footer { background: var(--bg-alt); color: var(--text-2); font-size: .75rem; line-height: 1.3333; letter-spacing: -.01em; }
    .footer .content { padding-block: 17px 11px; }
    .footer p + p { margin-top: .5rem; }   /* about */
  </style>
</head>
<body>
  <a class="skip-link" href="#main">Skip to content</a>
  <div id="nav-sentinel" aria-hidden="true" style="height:1px"></div>
  <header class="nav glass glass--bar" id="nav">
    <nav class="nav__inner" aria-label="Primary">
      <a class="nav__brand" href="/">Northwind</a>
      <a class="nav__link" href="#features">Features</a>
      <a class="nav__link" href="#specs">Specs</a>
      <a class="btn btn--reduced hit-expand" href="#buy">Buy</a>
    </nav>
  </header>

  <main id="main">
    <section class="hero" aria-labelledby="hero-title">
      <div class="content">
        <p class="t-eyebrow">Mill One</p>
        <h1 id="hero-title" class="t-hero">Grind, measured.</h1>
        <p class="t-intro text-2">A burr grinder that weighs every dose, so every cup starts the same.</p>
        <div class="cta-row">
          <a class="btn btn--elevated" href="#features">Learn more</a>
          <a class="btn btn--elevated btn--secondary" href="#buy">Buy</a>
        </div>
        <div class="hero__media" role="img" aria-label="Placeholder for product photo">Product image</div>
      </div>
    </section>

    <section id="features" class="section section--alt" aria-labelledby="features-title">
      <div class="content">
        <div class="section-header">
          <h2 id="features-title" class="t-section">Built around the dose.</h2>
          <a class="more" href="#specs">See all specs</a>
        </div>
        <div class="grid-3">
          <article class="card reveal"><p class="t-label">Precision</p>
            <h3 class="t-card">Accurate to 0.1 gram.<sup class="footnote"><a class="hit-expand" href="#fn-1">1</a></sup></h3></article>
          <article class="card reveal"><p class="t-label">Speed</p><h3 class="t-card">A full dose in seconds.</h3></article>
          <article class="card reveal"><p class="t-label">Quiet</p><h3 class="t-card">Early mornings stay early.</h3></article>
        </div>
      </div>
    </section>

    <section id="buy" class="section" aria-labelledby="buy-title">
      <div class="content" style="text-align:center">
        <h2 id="buy-title" class="t-headline">Ready when you are.</h2>
        <div class="cta-row"><a class="btn btn--elevated" href="#">Buy Mill One</a></div>
      </div>
    </section>
  </main>

  <footer class="footer">
    <div class="content">
      <p id="fn-1">1. Placeholder footnote: state the test conditions behind every claim.</p>
      <p>Copyright © 2026 Northwind. All rights reserved.</p>
    </div>
  </footer>

  <script>
    document.documentElement.classList.add('js');
    const nav = document.getElementById('nav');
    new IntersectionObserver(([e]) => nav.classList.toggle('is-scrolled', !e.isIntersecting))
      .observe(document.getElementById('nav-sentinel'));
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }, { rootMargin: '0px 0px -10% 0px' });
    document.querySelectorAll('.reveal').forEach((el, i) => { el.style.setProperty('--i', i % 3); io.observe(el); });
  </script>
</body>
</html>
```

To check the result, toggle dark mode, increase contrast and reduced motion in the OS settings, zoom text to 200%, and narrow the window to 320px. Each state should still read cleanly. Before a full-page screenshot, scroll to the bottom or turn on reduced motion; otherwise unrevealed `.reveal` elements are still transparent.
