/* The landing's palette and type (src/app/globals.css, layout.tsx), so the
   app and the page read as one thing: black ground, one orange, white paper.
   Every colour, size, radius and timing a screen uses comes from here. */

export const color = {
  orange: "#fc4e02",
  /** The edge the orange key sits on, and goes down into when pressed. */
  orangeEdge: "#9e3000",
  /** An orange hairline: a note that needs the eye without being an action. */
  orangeLine: "rgba(252, 78, 2, 0.45)",
  /* True black: on the Seeker's OLED the ground is pixels off, and the
     white receipt reads like paper under a lamp. */
  ink: "#000000",
  ink2: "#141416",
  ink3: "#212125",
  white: "#ffffff",
  /** The white key's edge. */
  whiteEdge: "#8f8a82",
  dim: "rgba(255, 255, 255, 0.72)",
  faint: "rgba(255, 255, 255, 0.5)",
  line: "rgba(255, 255, 255, 0.12)",
  red: "#ff4d3d",
  redEdge: "#a8261c",
  green: "#3ecf7a",
  greenEdge: "#1f8a4c",
  /** Words that ask for care on black ("Not sold to people in the US"): the orange, softened so it reads as a note, not a key. 11.8:1. */
  caution: "#ffb08a",
  /** Second-line words on an orange, green or white ground: 5:1 on orange. */
  inkDim: "rgba(0, 0, 0, 0.78)",
  /** What a sheet sits on: the screen behind stays in view, pushed back. */
  scrim: "rgba(0, 0, 0, 0.64)",
  /** A field's hint on white: 4.8:1, still quieter than what is typed. */
  placeholder: "#76716a",
  paperInk: "#1a1a1a",
  paperDim: "#5a554c",
  /** The receipt's dashed rule under the verdict, and the hairlines between its rows. */
  paperRule: "#bdb7ab",
  paperHair: "#eee9df",
  /** An answer still coming, on the receipt. */
  paperWell: "#ecebe7",
  /** Under the stamp's ink, so it reads over whatever it lands on. */
  stampGround: "rgba(255, 255, 255, 0.92)",
} as const;

/* The three verdicts, as the stamp inks them on the receipt. */
export const stamp = {
  ok: "#1f8a4c",
  warn: "#c7372b",
  block: "#b42d22",
} as const;

/* One type ramp for the whole app, named for what each size is for, with
   its line height and tracking: tight and pulled in on display type, open
   on reading type. Screens use these, not their own sizes. */
export const type = {
  /** The word when a trade lands. */
  moment: 76,
  /** A big money figure: the bag's worth, the amount being typed. */
  figure: 56,
  /** The first-run promise. */
  hero: 52,
  /** A tab's title. */
  title: 40,
  /** A coin's symbol, a status screen's title. */
  display: 32,
  /** The stamp's word on the receipt. */
  stamp: 30,
  /** The keypad's digits. */
  pad: 28,
  /** The receipt's verdict, an empty state's title, a sheet's title. */
  headline: 25,
  /** The key's label. */
  key: 19,
  lead: 18,
  body: 16,
  /** Chips, answers, toasts, the line over a list. */
  callout: 15,
  caption: 14,
  /** The line under a key, an address. */
  footnote: 13,
  micro: 12,
} as const;

export const leading = {
  moment: 80,
  figure: 60,
  hero: 52,
  title: 44,
  display: 36,
  stamp: 36,
  pad: 34,
  headline: 29,
  key: 24,
  lead: 25,
  body: 23,
  callout: 21,
  caption: 20,
  footnote: 18,
  micro: 16,
} as const;

export const tracking = {
  moment: -3,
  figure: -2,
  hero: -1.8,
  title: -1.2,
  display: -0.8,
  headline: -0.4,
  key: -0.2,
  /** The receipt's typewriter kicker, opened up. */
  kicker: 0.8,
  /** The stamp's capitals. */
  stamp: 1.5,
} as const;

/* One spacing rhythm on a 4-point grid (x1 = 4), plus the three a screen
   is built on: the side gutter, the gap between sections, a row's height. */
export const space = {
  hair: 2,
  x1: 4,
  x2: 8,
  x3: 12,
  x4: 16,
  x5: 20,
  x6: 24,
  x7: 28,
  x8: 32,
  x10: 40,
  x12: 48,
  x14: 56,
  gutter: 20,
  section: 32,
  row: 56,
} as const;

/* Corners, by what they belong to: paper is barely rounded, a key and a
   field are soft, containers rounder, a sheet roundest, chips are pills. */
export const radius = {
  paper: 8,
  key: 16,
  card: 20,
  block: 24,
  sheet: 28,
  pill: 999,
} as const;

export const size = {
  /** The key and the white field. */
  key: 60,
  field: 58,
  /** The least a finger gets (Material's 48dp). */
  tap: 48,
  /** A chip: 44 tall, with 2 more above and below it to touch. */
  chip: 44,
  row: 64,
  tabBar: 62,
  icon: 24,
  glyph: 20,
  /** The puppy beside a line of words (a toast, a hint). */
  mark: 28,
  /** A keypad key's height. */
  padKey: 56,
  /** One side of a two-way switch (Buy, Sell). */
  segment: 76,
  /** The handle at a sheet's top. */
  grabber: 36,
  /** A coin's face: in a list, on its page, in the moment. */
  faceRow: 40,
  faceCoin: 56,
  faceBadge: 52,
  /** The edge a key sits on, and how far it travels when pressed. */
  keyEdge: 4,
  keyTravel: 3,
  hairline: 1,
} as const;

/* Motion. Springs in Apple's terms (a response in seconds and a damping
   ratio) turned into what Animated.spring takes: ω = 2π / response,
   stiffness = ω², damping = 2·ratio·ω. */
const omega = (response: number) => (2 * Math.PI) / response;
const spring = (response: number, ratio: number) => ({ stiffness: Math.round(omega(response) ** 2), damping: Math.round(2 * ratio * omega(response)), mass: 1 });

export const motion = {
  /** Arriving and settling, no overshoot: a sheet, a panel. */
  settle: spring(0.3, 1),
  /** A touch of overshoot, only after a gesture that carried speed. */
  fling: spring(0.3, 0.8),
  /** The stamp coming down: fast, and it bounces off the paper. */
  thump: spring(0.24, 0.36),
  /** The puppy landing in the moment. */
  pop: spring(0.25, 0.32),
  fadeIn: 200,
  /** Leaving is quicker than arriving. */
  fadeOut: 140,
  press: 100,
  toggle: 160,
  /** The receipt's answers ticking in, one after another. */
  tick: 220,
  stagger: 70,
  toastIn: 180,
  toastOut: 220,
  /** How long a toast stays up. */
  toastHold: 3200,
} as const;

/* What sits over what. */
export const layer = {
  dock: 10,
  sheet: 50,
  toast: 60,
  moment: 100,
} as const;

export const shadow = {
  /** The receipt, lifted off the black. */
  paper: "0px 22px 44px rgba(0, 0, 0, 0.6)",
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
