---
name: apple-design
description: Design in Apple's visual language, covering apple.com-style product and marketing pages and app UI that follows the Human Interface Guidelines in the Liquid Glass era, on the web (HTML, CSS, React, Tailwind), in SwiftUI or as static banners. Keeps any existing brand and stays clear of Apple's logo, fonts, icons and assets. Use it when someone types /apple-design or asks for something Apple-like, apple.com style, HIG-compliant, Liquid Glass, frosted or glassy navigation, or iOS-style or macOS-style UI, or explicitly asks for Apple-quality polish.
---

# Apple design language

Design the way Apple does: content first, quiet chrome, disciplined type, generous space, materials used with intent. Two modes share that sensibility:

- **Marketing mode**: apple.com-style product, landing and launch pages, plus static banners and promo images.
- **App mode**: interfaces that follow the Human Interface Guidelines (HIG) of the Liquid Glass era (the 26 releases of 2025, refined in the 27 releases of 2026). Usually built on the web; sometimes SwiftUI or a static mockup.

If another skill governs the output container (an artifact page contract, a document or slide type, a required file format), follow that skill for the container (title, theming hooks, allowed libraries, file layout) and use this one for the visual language. The tokens below are plain CSS custom properties, so they drop into any `:root` block.

## Principles as decisions

The current HIG names eight principles: Purpose, Agency, Responsibility, Familiarity, Flexibility, Simplicity, Craft, Delight. Apple's WWDC26 design session adds: "Clarity is built with hierarchy, using order, spacing, and contrast." While building, that turns into these choices:

1. **Content leads, chrome recedes.** The product, the photo or the person's data is the hero. Navigation and controls float in a lighter layer above it and never compete with it.
2. **Build hierarchy with order, space and contrast first.** Before adding a border, box, shadow or color, try more space, a size step or a weight step. Boxes are the last resort.
3. **One idea per section or screen.** One headline, one or two supporting sentences (up to four in a section intro), one visual, one or two actions. Two ideas means two sections.
4. **Restrained color.** Near-black on white or light gray, plus one accent reserved for actions, links and selection. Color lives in imagery and content, because when everything is tinted nothing stands out.
5. **One type family, few weights.** Marketing: 600 for headlines, eyebrows and labels, 400 for body and subheads; apple.com almost never uses 700. App: follow the text-style weights (Regular and Semibold; Bold only for emphasized Large Title and Title 1–2). Never Ultralight, Thin or Light; they break down at small sizes. A brand display face keeps its own weights; these rules cover the system or body family. Load every weight you use (600, or the nearest the font has), because `font-synthesis: none` won't fake it. Set tracking per size from the tables below, never one letter-spacing for every size.
6. **Whitespace is the premium signal.** Marketing sections get very generous vertical padding. App UI stays compact but strictly aligned.
7. **Materials only where they mean something.** Liquid Glass belongs only on the functional layer: nav bars, toolbars, tab bars, sidebars, sheets, popovers, menus and floating controls. Never on cards or content, and never glass on glass. In native apps, content may use standard materials (references/app-ui-hig.md §6); on the web, keep content opaque.
8. **Quiet geometry.** Capsule buttons, one card radius, nested corners concentric (inner radius = outer radius − padding). Shadows rare or absent.
9. **Specific, short copy.** Numbers over adjectives; buttons start with a verb. Case follows the mode: marketing headlines and CTAs in sentence case ("Learn more"); app buttons, menu items, tabs and section headers in title case ("Add to Cart"); alert messages in sentence case. Details: references/app-ui-hig.md §17.
10. **Motion with a job.** Short and eased, tied to scroll or input, and replaced by fades or nothing under reduced motion. The HIG puts it as "Don't mistake delight for decoration."
11. **Simplicity isn't minimalism** (HIG). Never remove a label, affordance or needed fact just to look clean.
12. **Accessible from the start.** Contrast, 44px targets, scalable text, dark mode, reduced motion and increased contrast are part of the design, not a final pass.

## Keep the existing brand

If the project already has a brand (logo, colors, typeface, voice), keep it. Apply Apple's principles (restraint, hierarchy, whitespace, typographic discipline, materials) on top of that identity. Don't replace it with Apple's palette or Apple's blue.

- The brand primary becomes the single accent: primary buttons, links, selected state, focus ring. Every label on it reaches 4.5:1 in every state, hover and active included. If white fails on the exact brand color, darken the fill or keep the color and set the label to near-black (#1d1d1f); for a light brand (yellow, lime) the dark label is usually better. Use a darker shade of the brand for link text if needed.
- Give each brand color a dark-mode value: link text must reach 4.5:1 on both #000 and #1d1d1f (Apple's own link goes from #0066cc to #2997ff), and the focus ring 3:1 against both. references/web-implementation.md §3 shows where.
- Put the rest of the brand color in the content layer: imagery, illustration, a hero background, one featured section. Keep nav and toolbars neutral. The HIG moved brand color out of bars and into scrolling content for this reason.
- Keep the brand's headline typeface at its own weights. Pair it with the system stack for body and UI text if the brand font isn't built for text; the HIG recommends the same split. In a single self-contained file, embed the brand font or fall back to the system stack and say so.
- Use the brand's neutrals if it has them; otherwise use the neutral tokens below.
- Show the logo once (nav or hero). Branding defers to content. In a glass bar, use the brand's monochrome logo in `var(--text)`; a colored logo can vanish when brand-colored content scrolls under the bar.

Use Apple's color tokens unchanged only when there is no brand to respect.

## Legal guardrails

Make Apple-inspired work, not a copy of Apple.

- No Apple logo or Apple-logo glyph. No Apple product photos or renders. No images, icons, copy, slogans or taglines from apple.com. Write your own copy and use your own or clearly labeled placeholder imagery.
- Don't self-host, embed or hotlink SF Pro, SF Compact, SF Mono or New York, and don't name "SF Pro Display", "SF Pro Text" or "SF Pro Icons" in a font stack. The system stack below renders SF on Apple devices without shipping it. (The SF license covers only mockups of software UIs for Apple platforms.)
- The system stack is for live web pages only. For anything that ships as pixels or a PDF (banners, social images, slides), don't use `-apple-system` or `system-ui`; set Inter or the brand font explicitly so SF never ends up in the artwork.
- SF Symbols are for apps on Apple platforms. On the web or in non-Apple apps, use open-licensed sets such as Lucide, Phosphor or Heroicons.
- Don't draw Apple devices, such as a CSS iPhone with a Dynamic Island or Home button. To frame screenshots, use Apple's official bezels as-is, or a generic device without Apple-specific details.
- Never imply endorsement. Refer to Apple products referentially ("works with iPhone", "App for iPhone"), never in all caps. For an App Store badge, use only Apple's artwork, unmodified, at least 40px tall.
- Don't pixel-clone apple.com, because Apple's trademark guidelines object to imitating its website design. Borrow principles and proportions, not the page. Concretely: one nav bar, not Apple's global-plus-local pair, unless the site really has a product hierarchy; sections chosen by need, not Apple's section order; no copy of Apple's chapter-nav icon row, footer directory or "more ways to buy" line.

## Workflow

1. **Identify the mode.** Ask whether it sells or explains (marketing) or helps someone do a task (app). A landing page that shows app screens uses marketing rules for the page and app rules inside the screens. Then read only the reference sections that mode needs (see Reference files).
2. **Check what exists.** Look for brand assets and tokens: CSS variables, the Tailwind theme, logo files, font imports, a component library. Extend what is there instead of starting a parallel system.
3. **Pick tokens.** Choose the type scale (marketing or app), the color set (brand or neutral), content width and section rhythm, radii, and where, if anywhere, glass goes. Write them as custom properties before writing any component.
4. **Build in this order:** structure, type, space, color, materials, motion. Use semantic HTML, real copy and labeled placeholder images.
5. **Review** against the checklist below, fix what fails, then present.

In SwiftUI, prefer system components, text styles (`.font(.body)`) and system colors. They adopt Liquid Glass and the accessibility settings automatically. For a static banner, use the marketing type scale with one headline, one line of support, one visual, one CTA and plenty of empty space.

## Core tokens

The px values are Apple's. On the web, write them in rem against a 16px root (17px = 1.0625rem) so text scales with user settings. Anything marked "about" is guidance, not an Apple measurement.

### Font

```css
--font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", "Noto Sans", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
--font-mono: ui-monospace, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
```

For a closer look on non-Apple devices, insert `InterVariable, Inter` (SIL OFL) right after `BlinkMacSystemFont` and keep the rest of the stack. Inter applies only if you ship it (self-hosted `@font-face`, or embedded in a self-contained file); otherwise leave it out. Never call it SF.

### Marketing type (apple.com)

| Role | Size at ≥1069 / ≤1068 / ≤734 px | Weight |
|---|---|---|
| Hero headline | 80 / 64 / 48 | 600 |
| Section headline | 56 / 48 / 28 | 600 |
| Headline | 48 / 40 / 32 | 600 |
| Promo tile headline | 40 / 32 / 28 | 600 |
| Card headline | 28 / 24 / 21 | 600 |
| Eyebrow (normal case, never small caps) | 24 / 21 / 21 | 600 |
| Intro / subhead | 21 / 21 / 19 | 400 |
| Card label | 17 / 14 / 14 | 600 |
| Body | 17 | 400 |
| Caption, footer | 12 | 400 |

At ≤734px Apple's section headline (28) is smaller than its headline (32), so don't use those two roles to rank against each other, for example one nested under the other.

Line height and tracking for each size. Tracking is negative at body sizes (12–17px), slightly positive from 19 to 32px, zero at 40px and negative again above that.

| px | line-height | tracking | px | line-height | tracking |
|---|---|---|---|---|---|
| 96 | 1.0417 | -0.015em | 32 | 1.125 | 0.004em |
| 80 | 1.05 | -0.015em | 28 | 1.1429 | 0.007em |
| 72 | 1.0556 | -0.012em | 24 | 1.1667 | 0.009em |
| 64 | 1.0625 | -0.009em | 21 | 1.1905 (paragraph 1.381) | 0.011em |
| 56 | 1.0714 | -0.005em | 19 | 1.2105 (paragraph 1.4211) | 0.012em |
| 48 | 1.0835 | -0.003em | 17 | 1.4706 (tight 1.2354) | -0.022em |
| 44 | 1.0909 | -0.001em | 14 | 1.4286 (tight 1.2858) | -0.016em |
| 40 | 1.1 | 0 | 12 | 1.3333 | -0.01em |

### App type (iOS text styles at the default size)

| Style | Size / leading (pt) | Weight (emphasized) | Tracking |
|---|---|---|---|
| Large Title | 34 / 41 | Regular (Bold) | 0.012em |
| Title 1 | 28 / 34 | Regular (Bold) | 0.014em |
| Title 2 | 22 / 28 | Regular (Bold) | -0.012em |
| Title 3 | 20 / 25 | Regular (Semibold) | -0.023em |
| Headline | 17 / 22 | Semibold | -0.026em |
| Body | 17 / 22 | Regular (Semibold) | -0.026em |
| Callout | 16 / 21 | Regular (Semibold) | -0.02em |
| Subhead | 15 / 20 | Regular (Semibold) | -0.016em |
| Footnote | 13 / 18 | Regular (Semibold) | -0.006em |
| Caption 1 | 12 / 16 | Regular (Semibold) | 0 |
| Caption 2 | 11 / 13 | Regular (Semibold) | 0.006em |

The minimum size on iOS is 11pt. On macOS, body text is 13pt.

### Color

Neutral set (apple.com):

| Token | Light | Dark | Use |
|---|---|---|---|
| text | #1d1d1f | #f5f5f7 | primary text |
| text-2 | #6e6e73 | #86868b | secondary text |
| text-3 | #86868b | #6e6e73 | large or non-essential text only (about 3.6:1 on white) |
| bg | #ffffff | #000000 | page |
| bg-alt | #f5f5f7 | #1d1d1f | alternating sections; cards on a white section |
| surface | #fafafc | #161617 | menus, open nav panels |
| hairline | rgba(0,0,0,.16) | rgba(255,255,255,.24) | keylines |
| link | #0066cc | #2997ff | inline links |
| accent | #0071e3 (hover #0077ed, active #006edb) | #0071e3 | filled buttons, focus ring |

App mode uses the iOS system colors. Light / dark values: blue #0088ff / #0091ff, green #34c759 / #30d158, red #ff383c / #ff4245, orange #ff8d28 / #ff9230, systemGray #8e8e93, Gray6 #f2f2f7 / #1c1c1e. The full table and the increased-contrast variants are in references/app-ui-hig.md §8. White text on #0088ff is about 3.5:1. That meets the HIG's 3:1 floor for bold text but not WCAG AA for 17px labels, so on the web use #0071e3 or a darker blue behind small text.

### Space and layout

- **Content width:** `min(87.5%, 1260px)`. The classic container is 980px, then 692px at ≤1068px, then 87.5% at ≤734px. Hero media can reach 1680px on screens ≥1441px.
- **Breakpoints:** 1068px and 734px, plus 480px for extra-small screens.
- **Section padding:** 160 / 128 / 96px, or 112 / 96 / 56px for dense sections. Hero top padding is 60 / 40px. The gap under a section header is 80 / 64 / 48px.
- **Gutters and padding:** 20px between cards, 12px seams between mosaic tiles, 28px inside cards. Nav side padding is 22px (16px at ≤833px).
- **App UI:** 44×44 touch targets (28×28 is the absolute minimum). Leave about 12px around bordered controls and about 24px around borderless ones. Side margins are about 16px at compact width and 20px at regular width.

### Radii

- Buttons and pills: capsule (`border-radius: 980px`).
- Cards and modals: 28px. Smaller tiles: 18px. Full-width block buttons: 8px. Badges: 6px.
- App UI: Apple publishes no iOS radius numbers. On iOS, use capsules for buttons and bars. In macOS-style UI, mini, small and medium controls are rounded rectangles and only large and X-Large controls are capsules. Derive inner corners concentrically (outer radius − padding), with a small minimum so they never turn square by accident.

### Motion

- **Standard:** `cubic-bezier(.4, 0, .6, 1)`, 0.24s for opacity and background, 0.32s for color and size.
- **Card hover:** transform over 0.3s with `cubic-bezier(0, 0, .5, 1)` to a subtle scale. Apple's exact value is unknown; about 1.02 reads right.
- **Scroll reveal:** fade in while rising 30px. Opacity 0.9s, transform 0.7s, 0.15s stagger per item.
- **App springs:** SwiftUI's default animation is a critically damped spring (response 0.55, damping fraction 1.0). CSS `linear()` approximations are in references/web-implementation.md §8.
- **Reduced motion:** swap movement for fades, or remove it.

### Glass (functional layer only)

Use Apple's own web nav recipe: `rgb(250 250 252 / .8)` in light mode and `rgb(22 22 23 / .8)` in dark, with `saturate(180%) blur(20px)`. Without `backdrop-filter` support, raise the alpha to .92 (light) and .88 (dark). Apple publishes no blur values for Liquid Glass, so any web version is an approximation. The paste-ready tokens and recipe, with contrast, transparency and forced-colors fallbacks, are in references/web-implementation.md §3 and §6.

## Self-review checklist

- **Mode:** each section or screen has one idea and one clear primary action.
- **Brand:** its colors, logo and type are intact. Apple's palette appears only if there was no brand.
- **Type:** system stack or brand font. Weights: marketing 400/600, app per text style, nothing thin. Tracking is set for each size. Display line height is about 1.05–1.2 and body about 1.47.
- **Color:** neutrals plus one accent. The accent appears only on actions, links and selection. Bars and navigation are not colored. Brand colors have dark-mode values.
- **Contrast:** text is at least 4.5:1 in every state, including over glass and images (3:1 only for WCAG large text: at least 24px regular or 18.66px bold). Tertiary gray is never used for body copy.
- **Space:** the section padding scale is applied, content width is capped, edges align, and no border does a job spacing could do.
- **Glass:** only on the functional layer (nav bars, toolbars, tab bars, sidebars, sheets, popovers, menus, floating controls). It is never stacked, it has a fallback without `backdrop-filter`, and its text, logo and accent pill stay legible over the worst background behind it.
- **Shape:** one card radius, capsule buttons, concentric nested corners, almost no shadows.
- **Interaction:** targets are at least 44px (expand the hit area of small pills, paddles and footnote markers), the focus ring is visible (2px accent, offset), and every custom control has a pressed state.
- **Dark mode:** it is designed rather than inverted and follows `prefers-color-scheme`.
- **Motion:** it is brief and purposeful, falls back to fades under `prefers-reduced-motion`, nothing autoplays without a control, and films have captions.
- **Text and layout:** text is sized in rem (no px root), so it scales. Layouts reflow at 1068 and 734px, with no horizontal scroll at 320px.
- **Copy:** claims are specific and footnoted, buttons start with a verb, case follows the mode (marketing headlines sentence case, app controls title case), and there is no "Click here".
- **Legal:** no Apple logo, no SF font files or SF font names in stacks, no system stack in rendered banners or PDFs, no SF Symbols on the web, no Apple photos or device drawings, no apple.com copy or page structure, and nothing implies endorsement.

## Reference files

- **references/marketing-pages.md**: read when building an apple.com-style page, section or banner. Covers page anatomy, grid and rhythm, global and local nav, the button family, heroes, cards and bento grids, galleries, imagery and video, scroll reveal, copy voice, footnotes and footer, and section recipes. Its CSS builds on web-implementation.md.
- **references/app-ui-hig.md**: read for app UI or anything that should feel like iOS or macOS, when deciding where glass goes, or before writing SwiftUI. Covers Liquid Glass rules, concentric shapes, the full text-style and system-color tables, hit targets, component rules, SF Symbols and app-icon rules, accessibility settings, UI writing and capitalization, and verified SwiftUI API names.
- **references/web-implementation.md**: read before writing CSS, Tailwind or React. The single home for shared CSS: paste-ready light and dark tokens, type classes, the glass recipe with fallbacks, continuous corners, spring easings and reveal, accessibility media queries, component CSS and a minimal page skeleton.

Read only the sections the job needs:

- **Marketing page on the web:** web-implementation §2–4, §6 and §8–11; marketing-pages §1–2, then §3–15 as the page needs them.
- **App UI on the web:** app-ui-hig §3–4, §10–11, §17 and §19; web-implementation §2–4, §6 and §9–10.
- **SwiftUI:** app-ui-hig §3–5, §7–8 and §20.
- **Static banner:** marketing-pages §3, §13 and §15 (recipe 10).
