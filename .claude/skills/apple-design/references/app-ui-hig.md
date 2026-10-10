# App UI: HIG and Liquid Glass

Based on the HIG as of October 2026 and the WWDC25 and WWDC26 design sessions. The HIG publishes no numeric radii, blur or opacity values for iOS; anything marked "about" here is guidance, not an Apple number. Apple says not to hard-code system color values in native apps, because they change between releases. On the web you have no choice, so treat the hex values below as snapshots.

## Contents

1. Where things stand (October 2026)
2. Principles
3. Two layers: content and controls
4. Liquid Glass rules
5. Shapes and concentricity
6. Standard materials
7. Typography
8. Color
9. Layout and adaptivity
10. Hit targets and spacing
11. Components
12. SF Symbols and interface icons
13. App icons
14. Motion
15. Dark Mode
16. Accessibility settings
17. Writing and capitalization
18. Branding inside an app
19. Building app UI on the web
20. SwiftUI notes (verified API names)

## 1. Where things stand (October 2026)

**Liquid Glass (2025)**

- Shipped with the 26 releases (iOS, iPadOS, macOS Tahoe, watchOS, tvOS) at WWDC25.
- Apple's goals for it: establish hierarchy, create harmony, maintain consistency.

**The 27 releases (WWDC26) refine it rather than replace it**

- **Material:** glass diffuses complex content behind it more effectively. It gains a darkened edge and brighter specular highlights.
- **Settings slider:** people can set glass anywhere from "ultra clear" to "fully tinted". Standard glass follows the slider automatically.
- **Windows (macOS):** all windows share one tighter corner radius.
- **Toolbars (macOS):** a more uniform toolbar appears when content scrolls under the floating bars.
- **Sidebars (Mac and iPad):** they extend to the window edges, and their icons use the app's accent color again.
- **Menus (macOS and iPadOS):** menu-item icons are hidden by default.
- **No opt-out:** building with the 27 SDKs ignores `UIDesignRequiresCompatibility`, so every design must work with glass.

**Since June 2026**

- **iPhone Duo (folding, September 2026):** on the outer display, and on the inner display in landscape, toolbars and tab bars move to a vertical side rail.
- **Tools:** SF Symbols 27 (released, over 7,000 symbols; the June 2026 beta was called SF Symbols 8) and the updated Icon Composer (refraction and new specular highlights; requires macOS Tahoe 26.4 or later).

## 2. Principles

The HIG reintroduced its design principles in June 2026:

- **Purpose:** make something meaningful.
- **Agency:** let people do things their own way. Support undo and confirm destructive actions.
- **Responsibility:** act in people's best interest. Ask for permissions at the right moment and say why.
- **Familiarity:** build on what people know.
- **Flexibility:** adapt to diverse contexts and needs, with accessibility from the start.
- **Simplicity:** be clear and direct. "Simplicity isn't minimalism."
- **Craft:** care about every detail.
- **Delight:** make it human. "Don't mistake delight for decoration."

## 3. Two layers: content and controls

**Content layer**

- Lists, media, text, cards and canvases.
- Opaque surfaces or standard materials (§6).
- Brand color lives here.

**Functional layer**

- Tab bars, toolbars, navigation bars, sidebars, sheets, popovers, menus, alerts and floating buttons.
- Liquid Glass lives here, floating above the content.

**How the layers meet**

- Separate controls from content with glass and a scroll edge effect, not with a solid or semi-opaque bar background or a hard divider.
- Let full-bleed backgrounds extend under sidebars, toolbars and tab bars.
- Express hierarchy through layout and grouping, not decoration.

## 4. Liquid Glass rules

**Use glass for**

- The functional layer only.
- Standard components get it automatically.
- On custom controls, apply it only to the most important functional elements. Put it on the control itself, not on the views inside it.

**Don't use glass**

- In the content layer. A list in glass "would muddy the hierarchy." Use standard materials for app backgrounds and cards instead.
- On top of glass. For elements sitting on glass, use fills, transparency and vibrancy.
- The exception: transient interactive parts, such as slider and toggle knobs, become glass while they are being used.

**Regular vs clear (never mix the two)**

- **Regular** is the default and what most system components use. It blurs and adjusts the luminosity of what's behind it, works at any size over any content, and suits text-heavy components (alerts, sidebars, popovers).
- **Clear** is permanently more transparent and does not adapt. Use it only when all three hold: it sits over media-rich content, a dimming layer won't hurt that content, and the content on top of the glass is bold and bright.
- If the content under clear glass is bright, add a dark dimming layer at 35% opacity. Dark content needs none.

**Color and tinting**

- Glass has no color of its own; it takes color from what's behind it.
- A tint produces a range of tones mapped to the brightness underneath, like stained glass. Opaque solid fills on glass break its character.
- Tint only primary actions and status. Put the color on the button background, not on the symbol or text.
- Never tint several controls: "When every element is tinted, nothing stands out."
- Over colorful content, keep toolbars and tab bars monochrome.
- At rest (at launch, or at the top of a scroll), avoid content overlapping glass in a similar color.
- Supply light and dark colors even for a single-appearance app, because glass adapts.

**Adaptivity (what system glass does)**

- Small elements (navigation bars, tab bars, toolbars) flip between light and dark based on what's behind them. Their symbols and text flip too.
- Large elements (menus, sidebars) adapt but don't flip, and are more opaque.
- Glass gets "thicker" as it grows, with deeper shadow and stronger lensing, for example when a menu opens from a button.
- Glass recedes when its window loses focus.

**Bars**

- Remove custom bar backgrounds and borders.
- Group items by function. Don't group a text button with a symbol button, because they read as one button.
- Put the primary action (Done) on its own on the trailing side, tinted. Use only one prominent item per bar.
- Move secondary actions into a More menu.

**Scroll edge effect**

- It replaces hard dividers where floating UI overlaps scrolling content. It is not decoration.
- Use one per view.
- The HIG says to prefer the automatic style. In the 27 releases it no longer switches between soft and hard but has its own look; on macOS it resolves to a hard edge behind free-floating text such as the window title.
- Override to `.soft` or `.hard` only after testing legibility: an override, `.soft` in particular, no longer matches the system default.

**Sheets and modality**

- An interrupting sheet gets glass plus a dimming layer. A parallel task gets glass without dimming.
- A sheet dragged to full height becomes more opaque.
- Action sheets spring from the control that opened them.

## 5. Shapes and concentricity

Apple's WWDC25 design-system session calls it "quiet geometry," driven by concentricity: radii and margins share a common center so nested shapes fit.

**Three shape types**

- **Fixed:** a constant radius.
- **Capsule:** radius = half the height. Used for buttons, sliders, switches, bars and the corners of grouped tables.
- **Concentric:** radius = parent radius − padding.

**Concentric corners in practice**

- A concentric corner far from its container's corner resolves to 0, a square corner. Give it a fallback minimum.
- Nested artwork in a card should be concentric.
- Watch for corners that look "pinched" or "flared."
- Toolbar items are concentric with the corners of their bar.

**Near the screen edge**

- iPhone: a capsule with extra margin.
- iPad and Mac: a concentric shape aligned to the window corner.

**macOS control shapes**

- Mini, small and medium controls stay rounded rectangles.
- Large and X-Large controls are capsules.

**2025 metrics**

- Sheets got larger corner radii, and half sheets are inset from the display edge.
- Lists and forms got taller rows, more padding and a larger section radius.
- Controls got taller.

**Numbers**

- Apple publishes these radii only in the Figma and Sketch UI kits, not in the HIG.
- On the web, start from a known outer radius and derive the inner ones (web-implementation.md §7).

## 6. Standard materials

These are for the content layer.

**iOS and iPadOS**

- Materials, thinnest to thickest: ultraThin, thin, regular (the default), thick.
- Pair them with the vibrant label colors (label, secondaryLabel, tertiaryLabel, quaternaryLabel) and fills (fill, secondaryFill, tertiaryFill).
- Choose a material by meaning, not by how it looks. Thicker gives fine text more contrast; thinner shows more context.
- Avoid quaternary labels on thin or ultraThin, where contrast is too low.

**visionOS**

- Windows use an unmodifiable glass.
- Thin is for interactive elements, regular separates sections, and thick is for dark elements on regular.
- visionOS has no Dark Mode.

## 7. Typography

**Families**

- **SF Pro:** the system font on iOS, iPadOS, macOS, tvOS and visionOS. Nine weights, four widths, a Rounded variant, and optical sizes that interpolate between Text and Display.
- **SF Compact:** watchOS.
- **SF Mono.**
- **New York:** serif.

Don't embed system fonts in apps, and never self-host them on the web.

**Default and minimum sizes**

| Platform | Default | Minimum |
|---|---|---|
| iOS / iPadOS | 17pt | 11pt |
| macOS | 13pt | 10pt |
| tvOS | 29pt | 23pt |
| visionOS | 17pt | 12pt |
| watchOS | 16pt | 12pt |

**iOS Dynamic Type at the default size, "Large"**

| Style | Weight | Size | Leading | Emphasized |
|---|---|---|---|---|
| Large Title | Regular | 34 | 41 | Bold |
| Title 1 | Regular | 28 | 34 | Bold |
| Title 2 | Regular | 22 | 28 | Bold |
| Title 3 | Regular | 20 | 25 | Semibold |
| Headline | Semibold | 17 | 22 | Semibold |
| Body | Regular | 17 | 22 | Semibold |
| Callout | Regular | 16 | 21 | Semibold |
| Subhead | Regular | 15 | 20 | Semibold |
| Footnote | Regular | 13 | 18 | Semibold |
| Caption 1 | Regular | 12 | 16 | Semibold |
| Caption 2 | Regular | 11 | 13 | Semibold |

At the other sizes, Large Title / Body run:

- Smaller: xSmall 31/14, Small 32/15, Medium 33/16.
- Larger: xLarge 36/19, xxLarge 38/21, xxxLarge 40/23.
- Accessibility sizes: AX1 44/28, AX2 48/33, AX3 52/40, AX4 56/47, AX5 60/53.

Support Dynamic Type through AX5 and text enlargement of at least 200%.

**macOS text styles** (size / line height in pt; macOS has no Dynamic Type)

| Style | Size / line height |
|---|---|
| Large Title | 26/32 |
| Title 1 | 22/26 |
| Title 2 | 17/22 |
| Title 3 | 15/20 |
| Headline (Bold) | 13/16 |
| Body | 13/16 |
| Callout | 12/15 |
| Subheadline | 11/14 |
| Footnote | 10/13 |
| Caption 1 | 10/13 |
| Caption 2 (Medium) | 10/13 |

**SF Pro tracking** (iOS, iPadOS, visionOS), in thousandths of an em. For CSS `letter-spacing`, divide by 1000 and write in em: 17px → -0.026em.

| Size | Tracking | Size | Tracking |
|---|---|---|---|
| 11 | +6 | 20 | -23 |
| 12 | 0 | 22 | -12 |
| 13 | -6 | 24 | +3 |
| 14 | -11 | 28 | +14 |
| 15 | -16 | 34 | +12 |
| 16 | -20 | 48 | +8 |
| 17 | -26 | 60 | +4 |
| | | 80 and up | 0 |

**Rules**

- **Weights:** avoid Ultralight, Thin and Light. Prefer Regular, Medium, Semibold and Bold.
- **Typefaces:** use as few as possible. A custom brand font can carry headlines while the system font handles body and captions.
- **Leading:** loose for long or wide passages. Tight only in constrained rows, and never for three or more lines.
- **2025 change:** alerts and onboarding use larger, bolder, left-aligned type.

## 8. Color

**System colors** (iOS 26 and later; light / dark / increased-contrast light / increased-contrast dark)

| Color | Light | Dark | IC light | IC dark |
|---|---|---|---|---|
| Red | #FF383C | #FF4245 | #E9152D | #FF6165 |
| Orange | #FF8D28 | #FF9230 | #C55300 | #FFA056 |
| Yellow | #FFCC00 | #FFD600 | #A16A00 | #FEDF43 |
| Green | #34C759 | #30D158 | #008932 | #4AD968 |
| Mint | #00C8B3 | #00DAC3 | #008575 | #54DFCB |
| Teal | #00C3D0 | #00D2E0 | #008198 | #3BDDEC |
| Cyan | #00C0E8 | #3CD3FE | #007EAE | #6DD9FF |
| Blue | #0088FF | #0091FF | #1E6EF4 | #5CB8FF |
| Indigo | #6155F5 | #6D7CFF | #564ADE | #A7AAFF |
| Purple | #CB30E0 | #DB34F2 | #B02FC2 | #EA8DFF |
| Pink | #FF2D55 | #FF375F | #E7124D | #FF8AC4 |
| Brown | #AC7F5E | #B78A66 | #956D51 | #DBA679 |

The light blue was #007AFF before June 2025.

**System grays**

| Gray | Light | Dark | IC light | IC dark |
|---|---|---|---|---|
| systemGray | #8E8E93 | #8E8E93 | #6C6C70 | #AEAEB2 |
| Gray2 | #AEAEB2 | #636366 | #8E8E93 | #7C7C80 |
| Gray3 | #C7C7CC | #48484A | #AEAEB2 | #545456 |
| Gray4 | #D1D1D6 | #3A3A3C | #BCBCC0 | #444446 |
| Gray5 | #E5E5EA | #2C2C2E | #D8D8DC | #363638 |
| Gray6 | #F2F2F7 | #1C1C1E | #EBEBF0 | #242426 |

**Semantic colors**

Background sets (primary = the whole view; secondary = groups inside it; tertiary = groups inside those):

- systemBackground, secondarySystemBackground, tertiarySystemBackground.
- The grouped equivalents: systemGroupedBackground, secondarySystemGroupedBackground, tertiarySystemGroupedBackground.

Foreground colors:

- label, secondaryLabel, tertiaryLabel, quaternaryLabel.
- placeholderText, separator, opaqueSeparator, link.

Don't repurpose them; separator is not a text color, for example.

In Dark Mode, iOS uses a dimmer **base** set and a brighter **elevated** set. Sheets and popovers switch to elevated automatically, so a modal reads as lifted without a shadow.

**Approximate web values.** Apple doesn't publish these. These are third-party, pre-iOS 26 values, given as light / dark:

| Token | Light | Dark |
|---|---|---|
| label | #000 | #fff |
| secondaryLabel | rgba(60,60,67,.6) | rgba(235,235,245,.6) |
| tertiaryLabel | rgba(60,60,67,.3) | rgba(235,235,245,.3) |
| systemBackground | #fff | #000 |
| secondarySystemBackground | #F2F2F7 | #1C1C1E |
| tertiarySystemBackground | #fff | #2C2C2E |
| systemGroupedBackground | #F2F2F7 | #000 |
| secondarySystemGroupedBackground | #fff | #1C1C1E |
| separator | about rgba(60,60,67,.29) | about rgba(84,84,88,.6) |
| opaqueSeparator | about #C6C6C8 | about #38383A |

**Rules**

- **Meaning:** one meaning per color. Never rely on color alone; add a symbol, label or shape.
- **Culture:** mind cultural meaning. Red means "up" in Chinese stock apps.
- **Variants:** give every custom color light, dark and increased-contrast variants.
- **Accent:** use it for primary actions, unread badges and the selected tab only. Everything else that is brand-colored belongs in content.

## 9. Layout and adaptivity

**Hierarchy**

- Order by importance from the top and the leading edge.
- Align, and indent to show subordination.
- Group with space first, then containers or separators.
- Use progressive disclosure.

**Adaptivity**

- Lay out by size class (compact or regular, horizontal and vertical), not by device or orientation.
- Respect safe areas, margins and layout guides.
- Keep functionality the same across sizes. Switching from a tab bar to a sidebar is fine.

**Margins**

- UIKit's default subview layout margins are 8pt per side.
- Screen side margins are about 16pt at compact width and 20pt at regular width. This is common practice, not stated in the HIG.

**Ergonomics (iOS)**

- Controls in the middle and bottom of the screen are easiest to reach.
- Limit how many controls are on screen at once.

**iPhone Duo**

- Build to resize: compact width on the outer display, regular width on the inner one.
- Avoid the reserved regions (outer camera, inner camera, the fold).
- Use an even number of grid columns.
- Bars become a vertical side rail: Back or Close at the top, then the prominent action, with overflow running bottom to top. Text buttons stay horizontal, so prefer symbols.

**Other platforms**

- macOS: no critical controls at the bottom of a window.
- tvOS: safe area 60pt top and bottom, 80pt at the sides.
- visionOS: button centers at least 60pt apart.

## 10. Hit targets and spacing

| Platform | Default control size | Minimum |
|---|---|---|
| iOS / iPadOS | 44×44 pt | 28×28 pt |
| macOS | 28×28 pt | 20×20 pt |
| tvOS | 66×66 pt | 56×56 pt |
| visionOS | 60×60 pt | 28×28 pt |
| watchOS | 44×44 pt | 28×28 pt |

- **Spacing:** leave about 12pt around bezeled elements and about 24pt around borderless ones.
- **Press state:** give every custom button one.

## 11. Components

**Buttons**

- One or two prominent buttons per view. Mark the preferred option by style, not size.
- Labels are title case and start with a verb ("Add to Cart").
- Roles are normal, primary, cancel and destructive. Never make a destructive button the primary one.
- On macOS, add an ellipsis when the button opens another window.

**Tab bars (iOS)**

- They float at the bottom on glass.
- Navigation only, never actions. Never hide or disable a tab.
- Default to five or fewer tabs, with single-word labels and filled symbols.
- Optional extras: a search tab at the trailing end, minimize on scroll, and an accessory such as a mini player (not for screen-specific actions).
- A badge is a red oval with white text.

**Toolbars**

- Titles under 15 characters, and never the app name.
- Use the standard Back and Close symbols with no "Back" text, and borderless system symbols for items.
- Pin items leading, center or trailing.
- Items overflow into a system menu as space shrinks. iPadOS and macOS already did this; iOS 27 adds iPhone. Use `.visibilityPriority(_:)` to set which items overflow first, and `ToolbarOverflowMenu` for actions that always belong in the overflow menu, instead of building your own.

**Sheets (iOS)**

- Cancel on the leading edge, Done on the trailing edge. Pair Done with Cancel or Back, never all three.
- Show a grabber when the sheet is resizable.

**Lists and forms**

- Since 2025, section headers use title case instead of forced all caps.
- Rows are taller and sections rounder than before.

**Menus**

- Use icons sparingly: a group has icons on every item or on none.
- On macOS and iPadOS 27, show icons only for key actions.

**Standard action symbols** (SF Symbols names, for Apple-platform apps)

| Action | Symbol | Action | Symbol |
|---|---|---|---|
| Done | `checkmark` | Share | `square.and.arrow.up` |
| Cancel / Close | `xmark` | Search | `magnifyingglass` |
| Delete | `trash` | Add | `plus` |
| Compose | `square.and.pencil` | More | `ellipsis` |
| Undo / Redo | `arrow.uturn.backward` / `.forward` | Rename | `pencil` |
| Copy | `document.on.document` | Duplicate | `plus.square.on.square` |
| Paste | `document.on.clipboard` | Attach | `paperclip` |
| Cut | `scissors` | Move | `folder` |
| Select | `checkmark.circle` | | |

When no symbol is clear (for example Edit), use a text label.

## 12. SF Symbols and interface icons

**Rendering modes**

- Monochrome, hierarchical (one color at several opacities), palette (two or more colors) and multicolor. Every mode can take an optional gradient.
- Use variable color to show change, not depth.

**Sizing**

- Nine weights that match the SF font weights, so match the symbol weight to the adjacent text.
- Three scales (small, medium, large) relative to the text's cap height.

**Variants**

- Outline is the default, for toolbars and lists.
- Fill is for tab bars, swipe actions and selection.
- Slash shows the off state. Enclosed shapes read better at small sizes.

**Animations**

- Appear, Disappear, Bounce, Scale, Pulse, Variable Color, Replace, Magic Replace, Wiggle, Breathe, Rotate, Draw On/Off.
- Animate a symbol only when the motion tells people something (a state change, an action's result, ongoing activity), and not on every interaction.

**License**

- SF Symbols may only appear in the UI of software for Apple platforms.
- Never use them in app icons, logos or any trademarked use, or anything confusingly similar.

**On the web or other platforms**

- Use an open-licensed set (Lucide, Phosphor, Heroicons) with a stroke weight that matches the text weight.
- Use outline icons by default and filled ones for the selected state.
- Give icon-only controls an accessible label.

## 13. App icons

**Layers**

- A background plus one or more foreground layers, built in Icon Composer.
- The system adds the Liquid Glass highlights, refraction, translucency and shadow, so don't bake in highlights, shadows, bevels or blur.

**Canvas**

- iOS, iPadOS and macOS: a 1024×1024 px square, masked to a rounded rectangle.
- watchOS: 1088×1088 px, masked to a circle.
- Provide square, unmasked layers.

**Design**

- Use simple, filled, overlapping shapes, centered, with varied opacity. No feathered edges.
- Prefer illustration to photos. Use text only if it's essential.
- Never depict Apple hardware.

**Appearances**

- Default, dark, clear and tinted. The system generates any you don't supply.
- Lean toward colored backgrounds so the dark variant stays distinct.

## 14. Motion

**Best practices**

- Make motion purposeful, brief and precise, with feedback that follows the gesture.
- Avoid motion on frequent interactions, and let people cancel animations.

**Under Reduce Motion**

- Tighten springs so there's less bounce.
- Track animations directly to gestures.
- Avoid animating depth.
- Replace x/y/z transitions with fades.
- Don't animate into or out of blur.
- Cut zooming, scaling and peripheral motion.

**Springs**

- SwiftUI's default animation is a spring with response 0.55 and damping fraction 1.0 (no bounce).
- `.smooth`, `.snappy` and `.bouncy` default to 0.5s, with base bounce 0, 0.15 and 0.3.

## 15. Dark Mode

- **Follow the system.** Don't offer an app-specific appearance setting. A dark-only UI is fine for immersive media.
- **Don't invert.** Dark colors are designed, not inversions. Dim images with white backgrounds slightly; on the web, about `filter: brightness(.9)` in dark mode.
- **Contrast:** at least 4.5:1, and aim for 7:1 for custom colors, especially in small text.
- **Testing:** test with Increase Contrast and Reduce Transparency, separately and together.

## 16. Accessibility settings

**Contrast**

- Text up to 17pt needs 4.5:1.
- Text 18pt and above, or bold text, needs 3:1.
- On the web, use the WCAG thresholds instead: 4.5:1 below 24px regular or 18.66px bold, 3:1 only at or above them.

**Reduce Transparency**

- System glass gets frostier.
- Custom glass needs a more opaque fallback.

**Increase Contrast**

- System elements become mostly black or white, with a contrasting border.
- Supply increased-contrast variants of custom colors.

**Other settings**

- **Reduce Motion:** follow §14.
- **Show borders:** this replaces Button Shapes. Show visible edges on borderless buttons.
- **Differentiate Without Color:** add a shape or symbol wherever color carries meaning.

**VoiceOver**

- Label every icon and custom control, and hide decorative images.
- Avoid timed auto-dismiss, and never autoplay without controls.

**Text size**

- Scale meaningful icons with the text.
- Stack layouts at large sizes rather than truncating.

## 17. Writing and capitalization

**Voice**

- Clear and brief. Remove words.
- Avoid "we": write "Unable to load content."
- Use possessives sparingly: "Favorites", not "Your Favorites".
- Say "tap" on touch devices, never "click here".

**Buttons**

- Labels are verbs ("Send", not "Let's do it!").
- Multistep flows go Get Started → Continue or Next → Done.

**Errors**

- Show them next to the problem.
- Don't blame the person, and skip "oops".
- Say how to fix it: "Choose a password with at least 8 characters."

**Other text**

- Empty states offer a next step.
- A setting's description says what happens when it is on.
- Placeholders show the expected format, such as "name@example.com".

**Capitalization:** pick one style per element type and keep it.

- **Title case** for buttons, menu items, segmented controls, tab labels, table column headings, list and form section headers, panel titles, and alert titles that are fragments (no period).
- **Sentence case** for alert titles that are full sentences, alert messages, box titles, slider labels (ending in a colon) and widget text.
- **The title-case rule:**
  - Capitalize every word except articles, coordinating conjunctions and prepositions of four or fewer letters.
  - Always capitalize the first and last word, and a short preposition that is part of a verb phrase ("Starting Up").
  - Menus drop articles ("View Settings"). On macOS, add an ellipsis when an item needs more input.

## 18. Branding inside an app

- **Where brand shows:** express it through voice, the content layer, an optional custom headline font and familiar components. Branding "always defers to content."
- **Logo:** show it once (for example on Home, fading on scroll), never everywhere, and never on the launch screen.
- **Bars:** apps that used solid brand-colored bars before iOS 26 should move that color into the scrolling content. Bars stay glass and monochrome.
- **Accent:** use it for primary actions, selection and badges only.

## 19. Building app UI on the web

Translate the rules rather than imitating the pixels. Use the tokens and glass recipe in web-implementation.md.

**Type and color**

- Use text styles in rem (Body 1.0625rem, Large Title 2.125rem, and so on), with tracking from §7.
- Use the system font stack, never SF files.
- Use the system colors as CSS variables with light and dark values. Use the increased-contrast values under `prefers-contrast: more`.

**Bars and surfaces**

- Navigation bars, tab bars and toolbars are glass, floating over content that scrolls beneath them.
- Content surfaces are opaque on the web.
- Give one action per bar the accent background. The rest are monochrome.
- The selected tab uses the accent's text shade (`--link`, brand-mapped), not `--sys-blue`, which is about 3.4:1 on light glass. Its 11px label needs 4.5:1 against the bar over the worst backdrop (web-implementation.md §10).

**Shapes and targets**

- Buttons and bars are capsules. Nested corners are concentric.
- Every tappable element is at least 44×44px.
- Keep a floating bottom bar clear of the home indicator with `env(safe-area-inset-bottom)` and `viewport-fit=cover`.

**Lists and sheets**

- Grouped lists use title-case section headers, rows at least 44px tall, and inset rounded sections on Gray6 or the grouped background.
- Sheets put Cancel on the leading edge and Done on the trailing edge.

**Icons and motion**

- Use open-licensed outline icons, with filled variants for the selected tab.
- Use spring-like easing (`linear()` curves in web-implementation.md) for sheet and menu transitions, and fades under reduced motion.

## 20. SwiftUI notes (verified API names)

**Liquid Glass**

Available on iOS, iPadOS, Mac Catalyst, macOS, tvOS and watchOS 26 and later. visionOS uses `glassBackgroundEffect(displayMode:)` instead.

- **`glassEffect(_ glass: Glass = .regular, in shape: some Shape = DefaultGlassEffectShape())`:** the default shape is a capsule. Apply it after the other appearance modifiers.
- **`Glass`:** `.regular`, `.clear`, `.identity` (applies no effect), plus `.tint(_:)` and `.interactive(_:)`. For example, `.glassEffect(.regular.tint(.orange).interactive(), in: .rect(cornerRadius: 16))`. The `Glass.clear` documentation dims bright content with `.background(.black.opacity(0.3))`.
- **`GlassEffectContainer(spacing:)`:** wrap multiple glass views in one. It improves performance and enables morphing. If the container's spacing is larger than the stack's spacing, shapes blend together even at rest.
- **Grouping and morphing:** `.glassEffectUnion(id:namespace:)` merges shapes. `.glassEffectID(_:in:)` with a `@Namespace` drives morphs. `.glassEffectTransition(_:)` takes `.matchedGeometry` (the default within spacing), `.materialize` or `.identity`.
- **Button styles:** `.buttonStyle(.glass)`, `.buttonStyle(.glassProminent)` and `.buttonStyle(.glass(.clear))`, all available from iOS 26.0.
- **Background extension:** `.backgroundExtensionEffect()` mirrors and blurs a view, such as a hero image under a sidebar or inspector. Use it on a single view only.

**Bars and scroll edges**

- `.scrollEdgeEffectStyle(_:for:)` (keep `.automatic` unless testing shows you need `.hard` or `.soft`; see §4) and `scrollEdgeEffectHidden`.
- `.safeAreaBar(edge:alignment:spacing:content:)` registers a custom bar with the scroll edge effect.
- iOS 26: `.tabBarMinimizeBehavior(.onScrollDown)`, `ToolbarSpacer(.fixed)`. Since iOS 18 (restyled in 26): `Tab(role: .search)`, `sidebarAdaptable`.
- iOS 27: `Tab(role: .prominent)` (one tab only), `ToolbarOverflowMenu { }`, `.visibilityPriority(.high)` on toolbar items, `ToolbarItem(placement: .topBarPinnedTrailing)`, `.toolbarMinimizeBehavior(.onScrollDown, for: .navigationBar)`. Wrap them in `if #available(iOS 27, *)` when the app still deploys to 26.
- `@Environment(\.appearsActive)` (iOS 18 and later): use it to dim custom views, now that iPad windows also dim when inactive in iOS 27.

**Shapes**

- `RoundedRectangle(cornerRadius:style:)` and `.rect(cornerRadius:style:)` default to `.continuous` in current SDKs. Pass `style: .continuous` explicitly when back-deploying.
- `ContainerRelativeShape` (iOS 14 and later).
- `ConcentricRectangle()`, with per-corner styles `.concentric`, `.concentric(minimum:)` and `.fixed(_:)`. Example: `ConcentricRectangle(uniformTopCorners: .fixed(24), uniformBottomCorners: .concentric)`.
- `.rect(corners: .concentric, isUniform: true)`.
- `.containerShape(RoundedRectangle(cornerRadius: 20))` sets the shape that children are concentric to.

**Type, motion and accessibility**

- **Fonts:** use text styles (`.font(.body)`) and `Font.Design` `.default`, `.serif`, `.rounded` or `.monospaced`. Scale custom dimensions with `@ScaledMetric`.
- **Springs:** `.spring(duration: 0.5, bounce: 0)` is the default form. Also `.smooth`, `.snappy` and `.bouncy`.
- **Environment values:** `accessibilityReduceTransparency`, `accessibilityReduceMotion`, `colorSchemeContrast` (`.increased`), `accessibilityShowBorders` (replacing `accessibilityShowButtonShapes`), `accessibilityDifferentiateWithoutColor`, `dynamicTypeSize`.

**UIKit and AppKit equivalents**

- `UIGlassEffect` / `NSGlassEffectView`.
- UIButton configurations `.glass()`, `.prominentGlass()`, `.clearGlass()`, `.prominentClearGlass()`; `NSButton.BezelStyle.glass`.
- `UIBackgroundExtensionView` / `NSBackgroundExtensionView`.
- `UICornerConfiguration` through `cornerConfiguration`.

**Adopting Liquid Glass**

- Remove custom backgrounds from bars, split views, sheets and popovers.
- Avoid glass on glass.
- Tint with system colors, or with custom colors that have light, dark and increased-contrast variants.

```swift
// Two related floating controls that can morph; the primary action stays separate and prominent.
GlassEffectContainer(spacing: 20) {
    HStack(spacing: 20) {
        Button { edit() } label: {
            Image(systemName: "pencil").frame(width: 44, height: 44).contentShape(.circle)
        }
        .glassEffect(.regular.interactive())
        .accessibilityLabel("Edit")
        Button { delete() } label: {
            Image(systemName: "trash").frame(width: 44, height: 44).contentShape(.circle)
        }
        .glassEffect(.regular.interactive())
        .accessibilityLabel("Delete")
    }
}
Button("Done") { save() }
    .buttonStyle(.glassProminent)
```
