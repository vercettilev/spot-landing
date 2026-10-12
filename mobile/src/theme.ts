/* The landing's palette and type (src/app/globals.css, layout.tsx), so the
   app and the page read as one thing: black ground, one orange, white paper. */

export const color = {
  orange: "#fc4e02",
  orangeDeep: "#d94200",
  /* True black: on the Seeker's OLED the ground is pixels off, and the
     white receipt reads like paper under a lamp. */
  ink: "#000000",
  ink2: "#141416",
  ink3: "#212125",
  white: "#ffffff",
  dim: "rgba(255, 255, 255, 0.72)",
  faint: "rgba(255, 255, 255, 0.5)",
  line: "rgba(255, 255, 255, 0.12)",
  red: "#ff4d3d",
  green: "#3ecf7a",
  paper: "#f7f5f0",
  paperLine: "#d9d4ca",
  paperInk: "#1a1a1a",
  paperDim: "#5a554c",
} as const;

/* The three verdicts, as the stamp inks them on the receipt. */
export const stamp = {
  ok: "#1f8a4c",
  warn: "#c7372b",
  block: "#b42d22",
} as const;

/* One type ramp for the whole app (a 1.25 step from 16), and one spacing
   rhythm on a 4-point grid. Screens use these, not their own sizes. */
export const type = {
  hero: 52,
  title: 40,
  headline: 25,
  lead: 18,
  body: 16,
  caption: 14,
  micro: 12,
} as const;

export const space = {
  gutter: 20,
  section: 32,
  row: 56,
} as const;

/* The sniff report's answer chips, as on the landing's paper. */
export const tone = {
  good: { bg: "#e3f1e8", fg: "#1f6b45" },
  warn: { bg: "#fbebd3", fg: "#8a5300" },
  bad: { bg: "#f8e1de", fg: "#b42d22" },
  info: { bg: "#ecebe7", fg: "#5a554c" },
  unknown: { bg: "#ecebe7", fg: "#5a554c" },
} as const;

/* Font family names as registered by useFonts in App.tsx. */
export const font = {
  display: "Rubik_900Black",
  displayBold: "Rubik_800ExtraBold",
  body: "SchibstedGrotesk_400Regular",
  bodySemi: "SchibstedGrotesk_600SemiBold",
  bodyBold: "SchibstedGrotesk_700Bold",
  mono: "IBMPlexMono_500Medium",
} as const;
