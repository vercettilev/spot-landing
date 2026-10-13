import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Children, Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path, SvgXml } from "react-native-svg";
import { ICON_SVG, WORDMARK_SVG } from "../art";
import { color, font, leading, motion, radius, size, space, tone, tracking, type } from "../theme";
import type { Status } from "../types";

/* The small parts every screen shares: the marks, the buttons, the chips,
   a coin's face, and a tap that can be felt. */

/* Set from the user's settings by the store. */
let haptics = true;
export const setHaptics = (on: boolean) => {
  haptics = on;
};

export const tap = () => {
  if (haptics && Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
};

export const thud = () => {
  if (haptics && Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};

/** The verdict, felt: a success tap for clean, a warning for GRRR, an error buzz for NOPE. */
export const feel = (kind: "success" | "warning" | "error") => {
  if (!haptics || Platform.OS === "web") return;
  const type =
    kind === "success"
      ? Haptics.NotificationFeedbackType.Success
      : kind === "warning"
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Error;
  Haptics.notificationAsync(type).catch(() => {});
};

const native = Platform.OS !== "web";

export function Wordmark({ width = 76 }: { width?: number }) {
  return <SvgXml xml={WORDMARK_SVG} width={width} height={(width * 354) / 868} />;
}

export function PuppyIcon({ size: s = 56 }: { size?: number }) {
  return <SvgXml xml={ICON_SVG} width={s} height={(s * 423) / 444} />;
}

/** The orange key with travel, as on the landing: it sits on its edge and goes down when pressed. */
export function Button({
  label,
  onPress,
  disabled,
  kind = "go",
  style,
}: {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  kind?: "go" | "buy" | "sell" | "growl" | "stop" | "wait" | "quiet";
  style?: StyleProp<ViewStyle>;
}) {
  /* A disabled key of any kind is the same quiet grey, so "not now" never
     reads as a dimmed "go". */
  const look = BUTTON[disabled ? "stop" : kind];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      onPress={() => {
        thud();
        onPress?.();
      }}
      style={({ pressed }) => {
        const down = pressed && !disabled;
        return [
          styles.button,
          { backgroundColor: look.bg, borderColor: look.border },
          look.edge
            ? { boxShadow: `0px ${down ? size.keyEdge - size.keyTravel : size.keyEdge}px 0px ${look.edge}`, marginBottom: size.keyEdge }
            : null,
          down ? styles.buttonPressed : null,
          disabled ? styles.buttonDisabled : null,
          style,
        ];
      }}
    >
      <Text style={[styles.buttonText, { color: look.fg }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const BUTTON = {
  go: { bg: color.orange, fg: color.ink, border: color.orange, edge: color.orangeEdge },
  /* Buy green and sell red, the trading apps' own colours: a buy on a coin
     that growled keeps the warning's orange, because green says "clean". */
  buy: { bg: color.green, fg: color.ink, border: color.green, edge: color.greenEdge },
  sell: { bg: color.red, fg: color.white, border: color.red, edge: color.redEdge },
  growl: { bg: color.orange, fg: color.ink, border: color.orange, edge: color.orangeEdge },
  stop: { bg: color.ink3, fg: color.faint, border: color.line, edge: undefined },
  wait: { bg: color.white, fg: color.ink, border: color.white, edge: color.whiteEdge },
  quiet: { bg: "transparent", fg: color.white, border: color.line, edge: undefined },
} as const;

/** The landing's toggle: orange when on, its knob sliding over. The same on every platform. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const v = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: value ? 1 : 0, duration: motion.toggle, useNativeDriver: false }).start();
  }, [value, v]);
  return (
    <Pressable
      onPress={() => {
        tap();
        onChange(!value);
      }}
      hitSlop={space.x3}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value }}
    >
      <Animated.View
        style={[
          styles.track,
          { backgroundColor: v.interpolate({ inputRange: [0, 1], outputRange: [color.ink3, color.orange] }) },
        ]}
      >
        <Animated.View
          style={[styles.knob, { transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, KNOB_TRAVEL] }) }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

const TRACK = { width: 54, height: 32, pad: 3 };
const KNOB = TRACK.height - 2 * TRACK.pad - 2 * size.hairline;
const KNOB_TRAVEL = TRACK.width - 2 * TRACK.pad - 2 * size.hairline - KNOB;

/** An answer on the sniff report: "No", "Only 38", "Kinda". */
export function Answer({ status, children }: { status: Status; children: ReactNode }) {
  const t = tone[status];
  return (
    <View style={[styles.answer, { backgroundColor: t.bg }]}>
      <Text style={[styles.answerText, { color: t.fg }]}>{children}</Text>
    </View>
  );
}

/** A coin's icon, or its first letter on orange when it has none or it will not load. */
export function CoinFace({ uri, symbol, size: s = size.faceCoin }: { uri: string | null; symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const round = { width: s, height: s, borderRadius: s / 2 };
  if (!uri || failed) {
    return (
      <View style={[round, styles.faceFallback]}>
        <Text style={[styles.faceLetter, { fontSize: s * 0.42 }]}>{(symbol[0] ?? "?").toUpperCase()}</Text>
      </View>
    );
  }
  return <Image source={{ uri }} style={[round, styles.face]} contentFit="cover" onError={() => setFailed(true)} transition={150} />;
}

/** A slow breath, for whatever is waiting on the network. */
export function Breathing({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: native }),
        Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v]);
  return <Animated.View style={[style, { opacity: v }]}>{children}</Animated.View>;
}

/** A line that rises from the bottom for a few seconds; `bottom` lifts it over a screen's own bar. */
export function useToast(bottom = 120): [ReactNode, (message: string) => void] {
  const [message, setMessage] = useState<string | null>(null);
  const v = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = (m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(v, { toValue: 1, duration: motion.toastIn, useNativeDriver: native }).start();
    timer.current = setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: motion.toastOut, useNativeDriver: native }).start(() => setMessage(null));
    }, motion.toastHold);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const node = message ? (
    <Animated.View
      style={[
        styles.toast,
        { pointerEvents: "none", bottom },
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [space.x4, 0] }) }] },
      ]}
    >
      <PuppyIcon size={28} />
      <Text style={styles.toastText}>{message}</Text>
    </Animated.View>
  ) : null;
  return [node, show];
}

const styles = StyleSheet.create({
  button: {
    height: size.key,
    borderRadius: radius.key,
    borderWidth: size.hairline,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.x6,
  },
  buttonPressed: { transform: [{ translateY: size.keyTravel }] },
  buttonDisabled: { opacity: 0.85 },
  buttonText: { fontFamily: font.displayBold, fontSize: type.key, letterSpacing: tracking.key },
  track: { width: TRACK.width, height: TRACK.height, borderRadius: TRACK.height / 2, padding: TRACK.pad, borderWidth: size.hairline, borderColor: color.line },
  knob: { width: KNOB, height: KNOB, borderRadius: KNOB / 2, backgroundColor: color.white },
  answer: { borderRadius: radius.pill, paddingVertical: space.x1, paddingHorizontal: space.x3 },
  answerText: { fontFamily: font.bodyBold, fontSize: type.callout },
  face: { backgroundColor: color.ink3 },
  faceFallback: { backgroundColor: color.orange, alignItems: "center", justifyContent: "center" },
  faceLetter: { fontFamily: font.display, color: color.ink },
  toast: {
    position: "absolute",
    left: space.x4,
    right: space.x4,
    flexDirection: "row",
    alignItems: "center",
    gap: space.x3,
    padding: space.x4,
    borderRadius: radius.card,
    backgroundColor: color.white,
  },
  toastText: { flex: 1, fontFamily: font.bodySemi, fontSize: type.callout, lineHeight: leading.caption, color: color.ink },
  topBar: { flexDirection: "row", alignItems: "center", gap: space.x3, height: size.tap },
  topBack: { fontFamily: font.bodyBold, fontSize: 26, color: color.white, marginTop: -3 },
  topTitle: { flex: 1, fontFamily: font.bodySemi, fontSize: type.callout, color: color.dim },
  title: { marginTop: space.x2, fontFamily: font.display, fontSize: type.title, lineHeight: leading.title, letterSpacing: tracking.title, color: color.white },
  section: { marginTop: space.section, marginBottom: space.x3, marginLeft: space.x1, fontFamily: font.bodySemi, fontSize: type.callout, color: color.faint },
  card: { padding: space.x4, borderRadius: radius.card, backgroundColor: color.ink2, borderWidth: size.hairline, borderColor: color.line },
  settingRow: { flexDirection: "row", alignItems: "center", gap: space.x3, minHeight: size.row, paddingVertical: space.x4, paddingHorizontal: space.x4 },
  settingText: { flex: 1 },
  settingTitle: { fontFamily: font.bodyBold, fontSize: type.body, color: color.white },
  settingNote: { marginTop: space.hair, fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
  pill: {
    minWidth: space.x14,
    alignItems: "center",
    paddingVertical: space.x2,
    paddingHorizontal: space.x4,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    borderColor: color.line,
    backgroundColor: color.ink2,
  },
  pillOn: { backgroundColor: color.orange, borderColor: color.orange },
  pillOff: { opacity: 0.35 },
  pillText: { fontFamily: font.bodyBold, fontSize: type.callout, color: color.white },
  pillTextOn: { color: color.ink },
});

/** A screen's top: back (when it has somewhere to go back to), a title, and whatever sits on the right. */
export function TopBar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={space.x3} accessibilityRole="button" accessibilityLabel="Back">
          <Text style={styles.topBack}>←</Text>
        </Pressable>
      ) : null}
      <Text style={styles.topTitle} numberOfLines={1}>
        {title ?? ""}
      </Text>
      {right}
    </View>
  );
}

/** A tab's title, big, the way the landing sets a headline. */
export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Section({ children }: { children: ReactNode }) {
  return <Text style={styles.section}>{children}</Text>;
}

/** A dark card with a hairline, the app's one container. */
export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

/** A settings row: words on the left, a control on the right. */
export function SettingRow({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingText}>
        <Text style={styles.settingTitle}>{title}</Text>
        {note ? <Text style={styles.settingNote}>{note}</Text> : null}
      </View>
      {children}
    </View>
  );
}

/** A small round choice, as in the amount chips. */
export function Pill({ label, on, onPress, disabled }: { label: string; on?: boolean; onPress?: () => void; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      disabled={disabled}
      style={[styles.pill, on && styles.pillOn, disabled && styles.pillOff]}
      accessibilityRole="button"
      accessibilityState={{ selected: Boolean(on), disabled: Boolean(disabled) }}
    >
      <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

/* ---- grouped lists ----
   A list is one surface with hairlines between its rows, the way a phone's
   own settings read; a card per row would make every line shout. */

export function Group({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[group.wrap, style]}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 ? <View style={group.hairline} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

/** One line of a group: something on the left, a title and a line under it, something on the right. */
export function Row({
  left,
  title,
  subtitle,
  right,
  onPress,
  chevron,
  label,
}: {
  left?: ReactNode;
  title: string;
  subtitle?: string | null;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  label?: string;
}) {
  const body = (
    <>
      {left}
      <View style={group.text}>
        <Text style={group.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={group.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
      {chevron ? <Chevron /> : null}
    </>
  );
  if (!onPress) return <View style={group.row}>{body}</View>;
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [group.row, pressed && group.pressed]}
      accessibilityRole="button"
      accessibilityLabel={label ?? title}
    >
      {body}
    </Pressable>
  );
}

const group = StyleSheet.create({
  wrap: { borderRadius: radius.card, backgroundColor: color.ink2, overflow: "hidden" },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: space.x4, backgroundColor: color.line },
  row: { flexDirection: "row", alignItems: "center", gap: space.x3, minHeight: size.row, paddingVertical: space.x3, paddingHorizontal: space.x4 },
  pressed: { backgroundColor: color.ink3 },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.bodyBold, fontSize: type.body, color: color.white },
  subtitle: { marginTop: space.hair, fontFamily: font.body, fontSize: type.caption, color: color.faint },
});

/* ---- icons, drawn on one 24-unit grid with one stroke ---- */

function Glyph({ d, size: s = size.glyph, tint = color.faint, fill = "none" }: { d: string; size?: number; tint?: string; fill?: string }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={tint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

export const Chevron = ({ tint }: { tint?: string }) => <Glyph d="M9 6l6 6-6 6" size={18} tint={tint} />;

export const OutIcon = ({ tint }: { tint?: string }) => <Glyph d="M8 16L16 8M9.5 8H16v6.5" size={18} tint={tint} />;

/** The bell on a coin: outlined when Spot isn't watching it, filled orange when it is. */
export function Bell({ on }: { on: boolean }) {
  return (
    <Glyph
      d="M18 16.5V11a6 6 0 0 0-12 0v5.5L4.5 18h15L18 16.5zM10 20.5a2 2 0 0 0 4 0"
      size={26}
      tint={on ? color.orange : color.dim}
      fill={on ? color.orange : "none"}
    />
  );
}
