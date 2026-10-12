import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Children, Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import Svg, { Path, SvgXml } from "react-native-svg";
import { ICON_SVG, WORDMARK_SVG } from "../art";
import { color, font, tone } from "../theme";
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

export function Wordmark({ width = 76 }: { width?: number }) {
  return <SvgXml xml={WORDMARK_SVG} width={width} height={(width * 354) / 868} />;
}

export function PuppyIcon({ size = 56 }: { size?: number }) {
  return <SvgXml xml={ICON_SVG} width={size} height={(size * 423) / 444} />;
}

/** The orange key with travel, as on the landing: it sits on its shadow and goes down when pressed. */
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
  kind?: "go" | "growl" | "stop" | "wait" | "quiet";
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
          look.shadow ? { boxShadow: `0px ${down ? 1 : 4}px 0px ${look.shadow}`, marginBottom: 4 } : null,
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
  go: { bg: color.orange, fg: color.ink, border: color.orange, shadow: "#9e3000" },
  growl: { bg: color.orange, fg: color.ink, border: color.orange, shadow: "#9e3000" },
  stop: { bg: color.ink3, fg: color.faint, border: color.line, shadow: undefined },
  wait: { bg: color.white, fg: color.ink, border: color.white, shadow: "#8f8a82" },
  quiet: { bg: "transparent", fg: color.white, border: color.line, shadow: undefined },
} as const;

/** The landing's toggle: orange when on, its knob sliding over. The same on every platform. */
export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  const v = useRef(new Animated.Value(value ? 1 : 0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: value ? 1 : 0, duration: 160, useNativeDriver: false }).start();
  }, [value, v]);
  return (
    <Pressable
      onPress={() => {
        tap();
        onChange(!value);
      }}
      hitSlop={10}
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
          style={[styles.knob, { transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, 22] }) }] }]}
        />
      </Animated.View>
    </Pressable>
  );
}

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
export function CoinFace({ uri, symbol, size = 52 }: { uri: string | null; symbol: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const round = { width: size, height: size, borderRadius: size / 2 };
  if (!uri || failed) {
    return (
      <View style={[round, styles.faceFallback]}>
        <Text style={[styles.faceLetter, { fontSize: size * 0.42 }]}>{(symbol[0] ?? "?").toUpperCase()}</Text>
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
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
        Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: Platform.OS !== "web" }),
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
    Animated.timing(v, { toValue: 1, duration: 180, useNativeDriver: Platform.OS !== "web" }).start();
    timer.current = setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: 220, useNativeDriver: Platform.OS !== "web" }).start(() => setMessage(null));
    }, 3200);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const node = message ? (
    <Animated.View
      style={[
        styles.toast,
        { pointerEvents: "none", bottom },
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] },
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
    height: 60,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  buttonPressed: { transform: [{ translateY: 3 }] },
  buttonDisabled: { opacity: 0.85 },
  buttonText: { fontFamily: font.displayBold, fontSize: 19, letterSpacing: -0.2 },
  track: { width: 54, height: 32, borderRadius: 16, padding: 3, borderWidth: 1, borderColor: color.line },
  knob: { width: 24, height: 24, borderRadius: 12, backgroundColor: color.white },
  answer: { borderRadius: 999, paddingVertical: 5, paddingHorizontal: 12 },
  answerText: { fontFamily: font.bodyBold, fontSize: 15 },
  face: { backgroundColor: color.ink3 },
  faceFallback: { backgroundColor: color.orange, alignItems: "center", justifyContent: "center" },
  faceLetter: { fontFamily: font.display, color: color.ink },
  toast: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 120,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    backgroundColor: "rgba(255, 255, 255, 0.97)",
  },
  toastText: { flex: 1, fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20, color: color.ink },
  topBar: { flexDirection: "row", alignItems: "center", gap: 14, height: 48 },
  topBack: { fontFamily: font.bodyBold, fontSize: 26, color: color.white, marginTop: -3 },
  topTitle: { flex: 1, fontFamily: font.bodySemi, fontSize: 15, color: color.dim },
  title: { marginTop: 6, fontFamily: font.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: color.white },
  section: { marginTop: 32, marginBottom: 10, marginLeft: 4, fontFamily: font.bodySemi, fontSize: 15, color: color.faint },
  card: { padding: 16, borderRadius: 20, backgroundColor: color.ink2, borderWidth: 1, borderColor: color.line },
  settingRow: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 14, paddingHorizontal: 16 },
  settingText: { flex: 1 },
  settingTitle: { fontFamily: font.bodyBold, fontSize: 16, color: color.white },
  settingNote: { marginTop: 2, fontFamily: font.body, fontSize: 13.5, lineHeight: 18, color: color.faint },
  pill: {
    minWidth: 56,
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.ink2,
  },
  pillOn: { backgroundColor: color.orange, borderColor: color.orange },
  pillOff: { opacity: 0.35 },
  pillText: { fontFamily: font.bodyBold, fontSize: 15, color: color.white },
  pillTextOn: { color: color.ink },
});

/** A screen's top: back (when it has somewhere to go back to), a title, and whatever sits on the right. */
export function TopBar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      {onBack ? (
        <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
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
  wrap: { borderRadius: 20, backgroundColor: color.ink2, overflow: "hidden" },
  hairline: { height: StyleSheet.hairlineWidth, marginLeft: 16, backgroundColor: color.line },
  row: { flexDirection: "row", alignItems: "center", gap: 12, minHeight: 64, paddingVertical: 12, paddingHorizontal: 16 },
  pressed: { backgroundColor: color.ink3 },
  text: { flex: 1, minWidth: 0 },
  title: { fontFamily: font.bodyBold, fontSize: 16, color: color.white },
  subtitle: { marginTop: 2, fontFamily: font.body, fontSize: 14, color: color.faint },
});

/* ---- icons, drawn on one 24-unit grid with one stroke ---- */

function Glyph({ d, size = 20, tint = color.faint, fill = "none" }: { d: string; size?: number; tint?: string; fill?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={tint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
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
