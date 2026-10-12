/* The landing's palette and type (src/app/globals.css, layout.tsx), so the
   app and the page read as one thing: black ground, one orange, white paper. */

export const color = {
  orange: "#fc4e02",
  orangeDeep: "#d94200",
  ink: "#0b0b0c",
  ink2: "#151517",
  ink3: "#1f1f22",
  white: "#ffffff",
  dim: "rgba(255, 255, 255, 0.72)",
  faint: "rgba(255, 255, 255, 0.5)",
  line: "rgba(255, 255, 255, 0.14)",
  red: "#ff4d3d",
  green: "#3ecf7a",
  paper: "#f7f5f0",
  paperLine: "#d9d4ca",
  paperInk: "#1a1a1a",
  paperDim: "#5a554c",
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
