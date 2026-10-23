import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import {
  Children,
  Fragment,
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Keyboard,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, LinearGradient, Path, Rect, Stop, SvgXml } from "react-native-svg";
import { ICON_SVG, MARK_SVG, WORDMARK_SVG } from "../art";
import { faceSources } from "../logic";
import { color, font, layer, leading, motion, radius, size, space, tone, tracking, type } from "../theme";
import type { Status } from "../types";

/* The small parts every screen shares: the marks, the keys, the chips, a
   coin's face, sheets, the dock a trade sits in, and a tap that can be felt. */

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

/** Whether a screen reader is on, kept current: nothing then leaves on a timer the reader can't keep up with. */
export function useScreenReader(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    /* react-native-web answers true whatever the browser does; the web build is for looking at screens. */
    if (Platform.OS === "web") return;
    let alive = true;
    AccessibilityInfo.isScreenReaderEnabled()
      .then((v) => {
        if (alive) setOn(Boolean(v));
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener("screenReaderChanged", (v) => setOn(Boolean(v)));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return on;
}

/* The phone's "reduce motion" setting (Android: animations off), read once
   for the whole app and kept current, so whatever opens later is drawn for
   it from its first frame. Asked again by each sheet, the answer came just
   after the sheet had begun to slide in: the slide was cut off, the fade
   with it, and the sheet sat over the screen unseen, taking its taps. */
let reducedMotion = false;
const motionWatchers = new Set<() => void>();
const setReducedMotion = (on: boolean) => {
  if (on === reducedMotion) return;
  reducedMotion = on;
  motionWatchers.forEach((w) => w());
};
AccessibilityInfo.isReduceMotionEnabled()
  .then((on) => setReducedMotion(Boolean(on)))
  .catch(() => {});
AccessibilityInfo.addEventListener("reduceMotionChanged", (on) => setReducedMotion(Boolean(on)));

/** The phone's "reduce motion" setting, kept current: motion becomes a fade. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (changed) => {
      motionWatchers.add(changed);
      return () => motionWatchers.delete(changed);
    },
    () => reducedMotion,
  );
}

export function Wordmark({ width = 76 }: { width?: number }) {
  return <SvgXml xml={WORDMARK_SVG} width={width} height={(width * 354) / 868} />;
}

export function PuppyIcon({ size: s = 56 }: { size?: number }) {
  return <SvgXml xml={ICON_SVG} width={s} height={(s * 423) / 444} />;
}

/** The puppy alone, without its tile: for a ground that is already orange or green. */
export function PuppyMark({ width = 160 }: { width?: number }) {
  return <SvgXml xml={MARK_SVG} width={width} height={(width * 262) / 399} />;
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

/**
 * A coin's icon, tried from every place it can come from (faceSources in
 * logic.ts), or its first letter, quiet, when it has none: never in Spot's
 * orange, which is for keys, so a letter cannot pass for a brand.
 */
export function CoinFace({ uri, symbol, size: s = size.faceCoin }: { uri: string | null; symbol: string; size?: number }) {
  const sources = useMemo(() => faceSources(uri), [uri]);
  const [tried, setTried] = useState<{ uri: string | null; at: number }>({ uri, at: 0 });
  const at = tried.uri === uri ? tried.at : 0;
  const round = { width: s, height: s, borderRadius: s / 2 };
  const source = sources[at];
  if (!source) {
    return (
      <View style={[round, styles.faceFallback]} accessible accessibilityLabel={symbol}>
        <Text style={[styles.faceLetter, { fontSize: s * 0.42 }]}>{(symbol[0] ?? "?").toUpperCase()}</Text>
      </View>
    );
  }
  return (
    <Image
      key={source}
      source={{ uri: source }}
      style={[round, styles.face]}
      contentFit="cover"
      cachePolicy="memory-disk"
      onError={() => setTried({ uri, at: at + 1 })}
      transition={150}
      accessibilityLabel={symbol}
    />
  );
}

/** A slow breath, for whatever is waiting on the network. Held still when motion is reduced. */
export function Breathing({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const reduced = useReducedMotion();
  const v = useRef(new Animated.Value(0.45)).current;
  useEffect(() => {
    if (reduced) {
      v.setValue(0.7);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration: 700, useNativeDriver: native }),
        Animated.timing(v, { toValue: 0.45, duration: 700, useNativeDriver: native }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [v, reduced]);
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
    /* Long enough to read at an unhurried pace: a short "CA copied." goes soon, a sentence stays. */
    const hold = Math.min(motion.toastHoldMax, Math.max(motion.toastHold, motion.toastHoldBase + m.length * motion.toastPerChar));
    timer.current = setTimeout(() => {
      Animated.timing(v, { toValue: 0, duration: motion.toastOut, useNativeDriver: native }).start(() => setMessage(null));
    }, hold);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  const node = message ? (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        styles.toast,
        { pointerEvents: "none", bottom },
        { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [space.x4, 0] }) }] },
      ]}
    >
      <PuppyIcon size={size.mark} />
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
  faceFallback: { backgroundColor: color.ink3, alignItems: "center", justifyContent: "center", borderWidth: size.hairline, borderColor: color.line },
  faceLetter: { fontFamily: font.display, color: color.dim },
  toast: {
    position: "absolute",
    zIndex: layer.toast,
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
  topBar: { flexDirection: "row", alignItems: "center", gap: space.x1, height: size.tap },
  topTitle: { flex: 1, fontFamily: font.bodySemi, fontSize: type.callout, color: color.dim },
  section: { marginTop: space.section, marginBottom: space.x3, marginLeft: space.x1, fontFamily: font.bodySemi, fontSize: type.callout, color: color.faint },
  steps: { gap: space.x3 },
  step: { flexDirection: "row", gap: space.x3 },
  stepN: { minWidth: space.x4, fontFamily: font.displayBold, fontSize: type.callout, lineHeight: leading.callout, color: color.orange },
  stepText: { flex: 1, fontFamily: font.body, fontSize: type.callout, lineHeight: leading.callout, color: color.white },
  stepsNote: { marginTop: space.x1, fontFamily: font.body, fontSize: type.caption, lineHeight: leading.caption, color: color.dim },
  stepsCaution: { fontFamily: font.bodySemi, color: color.caution },
  card: { padding: space.x4, borderRadius: radius.card, backgroundColor: color.ink2, borderWidth: size.hairline, borderColor: color.line },
  settingRow: { flexDirection: "row", alignItems: "center", gap: space.x3, minHeight: size.row, paddingVertical: space.x4, paddingHorizontal: space.x4 },
  settingText: { flex: 1 },
  settingTitle: { fontFamily: font.bodyBold, fontSize: type.body, color: color.white },
  settingNote: { marginTop: space.hair, fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
  pill: {
    minWidth: space.x14,
    minHeight: size.chip,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.x4,
    borderRadius: radius.pill,
    borderWidth: size.hairline,
    borderColor: color.line,
    backgroundColor: color.ink2,
  },
  pillOn: { backgroundColor: color.orange, borderColor: color.orange },
  pillPressed: { backgroundColor: color.ink3 },
  pillOff: { opacity: 0.35 },
  pillText: { fontFamily: font.bodyBold, fontSize: type.callout, color: color.white },
  pillTextOn: { color: color.ink },
  iconButton: { width: size.tap, height: size.tap, borderRadius: size.tap / 2, alignItems: "center", justifyContent: "center" },
  iconButtonPressed: { backgroundColor: color.ink3 },
  actionKey: { alignItems: "center", gap: space.x2, minWidth: size.action + space.x6 },
  actionDisc: { width: size.action, height: size.action, borderRadius: size.action / 2, backgroundColor: color.ink2, alignItems: "center", justifyContent: "center" },
  actionLoud: { backgroundColor: color.orange },
  actionLoudPressed: { backgroundColor: color.orangeEdge },
  actionLabel: { fontFamily: font.bodyBold, fontSize: type.footnote, color: color.dim },
  field: {
    height: size.field,
    paddingHorizontal: space.x4 + space.hair,
    borderRadius: radius.key,
    backgroundColor: color.white,
    fontFamily: font.bodySemi,
    fontSize: type.lead,
    color: color.ink,
  },
  fieldMono: { fontFamily: font.mono, fontSize: type.callout },
});

/** A round, quiet button around one glyph: back, close. 48 to the touch whatever the glyph's size. */
export function IconButton({ icon, label, onPress, style }: { icon: keyof typeof GLYPHS; label: string; onPress: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconButton, pressed && styles.iconButtonPressed, style]}
    >
      <Glyph d={GLYPHS[icon]} size={size.icon} tint={color.white} />
    </Pressable>
  );
}

/** One of Home's round keys: a glyph in a disc, its word under it. The one loud key is orange. */
export function ActionKey({ glyph, label, onPress, loud }: { glyph: keyof typeof GLYPHS; label: string; onPress: () => void; loud?: boolean }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={styles.actionKey}
    >
      {({ pressed }) => (
        <>
          <View style={[styles.actionDisc, loud && styles.actionLoud, pressed && (loud ? styles.actionLoudPressed : styles.iconButtonPressed)]}>
            <Glyph d={GLYPHS[glyph]} size={size.icon} tint={loud ? color.ink : color.white} />
          </View>
          <Text style={styles.actionLabel} numberOfLines={1}>
            {label}
          </Text>
        </>
      )}
    </Pressable>
  );
}

/** A screen's top: back (when it has somewhere to go back to), a title, and whatever sits on the right. */
export function TopBar({ title, onBack, right }: { title?: string; onBack?: () => void; right?: ReactNode }) {
  return (
    <View style={styles.topBar}>
      {/* The arrow lines up with the gutter; its 48 of touch reaches past it. */}
      {onBack ? <IconButton icon="back" label="Back" onPress={onBack} style={{ marginLeft: -space.x3 }} /> : null}
      <Text style={styles.topTitle} numberOfLines={1}>
        {title ?? ""}
      </Text>
      {right}
    </View>
  );
}

export function Section({ children }: { children: ReactNode }) {
  return (
    <Text style={styles.section} accessibilityRole="header">
      {children}
    </Text>
  );
}

/** Numbered steps, for what is done outside Spot (a card buy in the wallet app, a cash-out through an exchange). `caution` inks the note as a risk. */
export function Steps({ steps, note, caution, style }: { steps: string[]; note?: string; caution?: boolean; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[styles.steps, style]}>
      {steps.map((s, i) => (
        <View key={s} style={styles.step} accessible accessibilityLabel={`${i + 1}. ${s}`}>
          <Text style={styles.stepN}>{i + 1}</Text>
          <Text style={styles.stepText}>{s}</Text>
        </View>
      ))}
      {note ? <Text style={[styles.stepsNote, caution && styles.stepsCaution]}>{note}</Text> : null}
    </View>
  );
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

/** A round choice, as in the amount chips: 44 tall, 48 to the touch. */
export function Pill({ label, on, onPress, disabled, accessibilityLabel }: { label: string; on?: boolean; onPress?: () => void; disabled?: boolean; accessibilityLabel?: string }) {
  return (
    <Pressable
      onPress={() => {
        tap();
        onPress?.();
      }}
      disabled={disabled}
      hitSlop={{ top: space.hair, bottom: space.hair }}
      style={({ pressed }) => [styles.pill, pressed && !on && styles.pillPressed, on && styles.pillOn, disabled && styles.pillOff]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: Boolean(on), disabled: Boolean(disabled) }}
    >
      <Text style={[styles.pillText, on && styles.pillTextOn]}>{label}</Text>
    </Pressable>
  );
}

/** The white field, as on the landing. `mono` for an address. */
export const Field = forwardRef<TextInput, TextInputProps & { mono?: boolean }>(function Field({ mono, style, ...props }, ref) {
  return (
    <TextInput
      ref={ref}
      placeholderTextColor={color.placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      style={[styles.field, mono && styles.fieldMono, style]}
    />
  );
});

/* ---- the keypad, for typing an amount ---- */

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Digits, a key of the caller's on the bottom left (Max, All), and delete; hold delete to clear. */
export function Keypad({ onDigit, onDelete, onClear, extra }: { onDigit: (d: string) => void; onDelete: () => void; onClear: () => void; extra?: { label: string; onPress: () => void } | null }) {
  const key = (k: string, content: ReactNode, onPress: () => void, a11y: string, onLongPress?: () => void) => (
    <Pressable
      key={k}
      onPress={() => {
        tap();
        onPress();
      }}
      onLongPress={onLongPress}
      style={({ pressed }) => [pad.key, pressed && pad.keyPressed]}
      accessibilityRole="button"
      accessibilityLabel={a11y}
    >
      {content}
    </Pressable>
  );
  return (
    <View style={pad.grid}>
      {KEYS.map((d) => key(d, <Text style={pad.digit}>{d}</Text>, () => onDigit(d), d))}
      {extra ? key("extra", <Text style={pad.word}>{extra.label}</Text>, extra.onPress, extra.label) : <View style={pad.key} />}
      {key("0", <Text style={pad.digit}>0</Text>, () => onDigit("0"), "0")}
      {key("del", <Glyph d={GLYPHS.delete} size={size.icon + 4} tint={color.white} />, onDelete, "Delete", () => {
        thud();
        onClear();
      })}
    </View>
  );
}

const pad = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", marginHorizontal: -space.x1 },
  key: { width: "33.333%", height: size.padKey, alignItems: "center", justifyContent: "center", borderRadius: radius.key },
  keyPressed: { backgroundColor: color.ink3 },
  digit: { fontFamily: font.displayBold, fontSize: type.pad, lineHeight: leading.pad, color: color.white },
  word: { fontFamily: font.bodyBold, fontSize: type.body, color: color.dim },
});

/* ---- the bar a trade sits in ---- */

/** Content scrolls under a soft edge into the bar instead of meeting a hard line. */
export function EdgeFade({ height = space.x6, style, from = "bottom" }: { height?: number; style?: StyleProp<ViewStyle>; from?: "top" | "bottom" }) {
  const id = `fade${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  /* `from`: the edge the black comes from, the bar's side. */
  const [y1, y2] = from === "bottom" ? ["0", "1"] : ["1", "0"];
  return (
    <View style={[{ height, pointerEvents: "none" }, style]}>
      <Svg width="100%" height={height}>
        <Defs>
          <LinearGradient id={id} x1="0" y1={y1} x2="0" y2={y2}>
            <Stop offset="0" stopColor={color.ink} stopOpacity={0} />
            <Stop offset="1" stopColor={color.ink} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height={height} fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

/** Pinned to the bottom over a screen's scroll: the trade, its amounts and what to know before it. */
export function Dock({ children, onHeight }: { children: ReactNode; onHeight?: (h: number) => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[dock.wrap, { paddingBottom: space.x3 + insets.bottom }]} onLayout={(e) => onHeight?.(e.nativeEvent.layout.height)}>
      <EdgeFade style={dock.fade} />
      {children}
    </View>
  );
}

const dock = StyleSheet.create({
  wrap: { position: "absolute", zIndex: layer.dock, left: 0, right: 0, bottom: 0, paddingTop: space.x2, paddingHorizontal: space.gutter, backgroundColor: color.ink },
  fade: { position: "absolute", left: 0, right: 0, top: -space.x6 },
});

/* ---- sheets ----
   A sheet rises over the screen it belongs to, which stays in view behind a
   scrim. It springs in (critically damped), follows the finger when its top
   is dragged, and is thrown away by a flick: the release speed is projected
   forward the way a scroll decelerates, and the sheet leaves at the speed
   it was let go. Back, a tap on the scrim and the close button put it away
   too, unless money is moving. Reduced motion makes it a fade. */

export interface SheetHandle {
  /** Animates the sheet away, then calls `after` (onDismiss if none). */
  close: (after?: () => void) => void;
}

/* Where a flick would come to rest, as a scroll decelerates (Apple's projection, deceleration 0.998 a millisecond). */
const project = (pxPerMs: number) => (pxPerMs * 0.998) / (1 - 0.998);
/* Past an edge, the finger moves the sheet less and less. */
const rubberband = (over: number, dimension: number, c = 0.55) => (over * dimension * c) / (dimension + c * Math.abs(over));

export const Sheet = forwardRef<
  SheetHandle,
  { visible: boolean; onDismiss: () => void; title?: string; children: ReactNode; dismissable?: boolean; label?: string }
>(function Sheet({ visible, onDismiss, title, children, dismissable = true, label }, ref) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const { height: screen } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [h, setH] = useState(0);
  const y = useRef(new Animated.Value(screen)).current;
  const shown = useRef(new Animated.Value(0)).current;
  const opening = useRef(visible);
  const closing = useRef(false);
  const startY = useRef(0);
  const heightRef = useRef(screen);
  const titleRef = useRef<Text>(null);
  const latest = useRef({ onDismiss, dismissable, reduced });
  latest.current = { onDismiss, dismissable, reduced };
  /* How far the keyboard would cover the sheet: the sheet rises by that
     much. Measured, not assumed: where the window already shrinks for the
     keyboard, nothing is covered and nothing moves. */
  const panelRef = useRef<View>(null);
  const [lift, setLift] = useState(0);
  const liftRef = useRef(0);
  useEffect(() => {
    const setTo = (n: number) => {
      liftRef.current = n;
      setLift(n);
    };
    const shown = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow", (e) => {
      panelRef.current?.measureInWindow((_x, top, _w, height) => setTo(Math.max(0, Math.round(top + height + liftRef.current - e.endCoordinates.screenY))));
    });
    const hidden = Keyboard.addListener(Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide", () => setTo(0));
    return () => {
      shown.remove();
      hidden.remove();
    };
  }, []);

  /* `turning`: opened again while leaving, so it starts from where it is on screen, not from the bottom. */
  function open(turning = false) {
    closing.current = false;
    if (!turning) shown.setValue(0);
    if (latest.current.reduced) {
      y.setValue(0);
      Animated.timing(shown, { toValue: 1, duration: motion.fadeIn, useNativeDriver: native }).start();
    } else {
      if (!turning) y.setValue(heightRef.current);
      /* A slide cut short (a finger catching the sheet, the motion setting
         changing) never takes the fade with it: the sheet always ends up seen. */
      Animated.parallel(
        [
          Animated.timing(shown, { toValue: 1, duration: motion.fadeIn, useNativeDriver: native }),
          Animated.spring(y, { toValue: 0, ...motion.settle, useNativeDriver: native }),
        ],
        { stopTogether: false },
      ).start();
    }
    /* Whoever listens hears the sheet, not the screen under it. */
    setTimeout(() => {
      if (titleRef.current && Platform.OS !== "web") AccessibilityInfo.sendAccessibilityEvent(titleRef.current, "focus");
    }, motion.fadeIn);
  }

  function close(after?: () => void, velocity = 0) {
    if (closing.current) return;
    closing.current = true;
    /* Only an exit that ran to its end lets go: one cut short by opening again keeps the sheet. */
    const done = ({ finished }: { finished: boolean }) => {
      if (!finished || !closing.current) return;
      setMounted(false);
      (after ?? latest.current.onDismiss)();
    };
    if (latest.current.reduced) {
      Animated.timing(shown, { toValue: 0, duration: motion.fadeOut, useNativeDriver: native }).start(done);
      return;
    }
    /* Leaves at the speed it was thrown: an ease-out whose first frame moves as fast as the finger did. */
    y.stopAnimation((from) => {
      const left = Math.max(0, heightRef.current - from);
      const duration = velocity > 0 ? Math.min(300, Math.max(120, (2 * left) / velocity)) : 220;
      Animated.parallel([
        Animated.timing(shown, { toValue: 0, duration, useNativeDriver: native }),
        Animated.timing(y, {
          toValue: heightRef.current,
          duration,
          easing: velocity > 0 ? Easing.out(Easing.quad) : Easing.in(Easing.cubic),
          useNativeDriver: native,
        }),
      ]).start(done);
    });
  }

  useImperativeHandle(ref, () => ({ close: (after) => close(after) }));

  useEffect(() => {
    if (visible) {
      /* Opened again while leaving: turn round from where it is. */
      if (mounted && closing.current) open(true);
      else {
        opening.current = true;
        setMounted(true);
      }
    } else if (mounted && !closing.current) {
      close(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => {
    if (!mounted || Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (latest.current.dismissable) close();
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) => latest.current.dismissable && Math.abs(g.dy) > 8 && Math.abs(g.dy) > Math.abs(g.dx),
        onPanResponderGrant: () => {
          y.stopAnimation((v) => {
            startY.current = v;
          });
        },
        onPanResponderMove: (_, g) => {
          const at = startY.current + g.dy;
          y.setValue(at >= 0 ? at : -rubberband(-at, heightRef.current));
        },
        onPanResponderRelease: (_, g) => {
          const rest = startY.current + g.dy + project(g.vy);
          if (g.vy > 0 && rest > heightRef.current / 2) close(undefined, g.vy);
          else Animated.spring(y, { toValue: 0, velocity: g.vy, ...motion.fling, useNativeDriver: native }).start();
        },
        onPanResponderTerminate: () => {
          Animated.spring(y, { toValue: 0, ...motion.settle, useNativeDriver: native }).start();
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  if (!mounted) return null;

  const scrim =
    h > 0 && !reduced
      ? Animated.multiply(shown, y.interpolate({ inputRange: [0, h], outputRange: [1, 0.25], extrapolate: "clamp" }))
      : shown;

  return (
    <View style={[StyleSheet.absoluteFill, sheet.layer]}>
      <Animated.View style={[StyleSheet.absoluteFill, sheet.scrim, { opacity: scrim }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => latest.current.dismissable && close()}
          accessibilityRole="button"
          accessibilityLabel="Close"
          importantForAccessibility="no"
          aria-hidden
        />
      </Animated.View>
      <Animated.View
        ref={panelRef}
        accessibilityViewIsModal
        accessibilityLabel={label}
        onLayout={(e) => {
          const next = e.nativeEvent.layout.height;
          heightRef.current = next;
          setH(next);
          if (opening.current) {
            opening.current = false;
            open();
          }
        }}
        style={[
          sheet.panel,
          /* A finger's width of the screen behind stays in view, to see what the sheet belongs to and to tap away. */
          { maxHeight: screen - insets.top - size.tap - lift, paddingBottom: (lift ? 0 : insets.bottom) + space.x4, marginBottom: lift },
          reduced ? { opacity: shown } : { transform: [{ translateY: y }] },
        ]}
      >
        <View {...pan.panHandlers} style={sheet.head}>
          <View style={sheet.grabber} />
          <View style={sheet.titleRow}>
            <Text ref={titleRef} style={sheet.title} accessibilityRole="header" numberOfLines={2} selectable={false}>
              {title ?? ""}
            </Text>
            {dismissable ? <IconButton icon="close" label="Close" onPress={() => close()} style={{ marginRight: -space.x3 }} /> : <View style={sheet.closeSpace} />}
          </View>
        </View>
        <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={sheet.body} contentContainerStyle={sheet.content}>
          {children}
        </ScrollView>
      </Animated.View>
    </View>
  );
});

/**
 * A sheet that is a screen of its own (Connect, Add cash): presented as a
 * transparent modal over the screen it belongs to. Every way out goes
 * through the sheet's own exit first: back, the scrim, the close button,
 * and the screen's code leaving or replacing it.
 */
type NavAction = Readonly<{ type: string }>;

export function useRouteSheet(navigation: {
  addListener: (type: "beforeRemove", cb: (e: { preventDefault: () => void; data: { action: NavAction } }) => void) => () => void;
  dispatch: (action: NavAction) => void;
  goBack: () => void;
}) {
  const ref = useRef<SheetHandle>(null);
  const leaving = useRef(false);
  useEffect(
    () =>
      navigation.addListener("beforeRemove", (e) => {
        if (leaving.current) return;
        e.preventDefault();
        leaving.current = true;
        if (ref.current) ref.current.close(() => navigation.dispatch(e.data.action));
        else navigation.dispatch(e.data.action);
      }),
    [navigation],
  );
  const onDismiss = () => {
    leaving.current = true;
    navigation.goBack();
  };
  return { ref, onDismiss };
}

const sheet = StyleSheet.create({
  layer: { zIndex: layer.sheet, justifyContent: "flex-end" },
  scrim: { backgroundColor: color.scrim },
  panel: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    backgroundColor: color.ink2,
    borderTopWidth: size.hairline,
    borderColor: color.line,
  },
  head: { paddingHorizontal: space.gutter, paddingTop: space.x2 },
  grabber: { alignSelf: "center", width: size.grabber, height: space.x1, borderRadius: radius.pill, backgroundColor: color.ink3 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: space.x3, minHeight: size.tap, marginTop: space.x2 },
  title: { flex: 1, fontFamily: font.display, fontSize: type.headline, lineHeight: leading.headline, letterSpacing: tracking.headline, color: color.white },
  closeSpace: { width: size.tap },
  body: { flexGrow: 0, flexShrink: 1 },
  content: { paddingHorizontal: space.gutter, paddingTop: space.x2 },
});

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

/** One line of a group: something on the left, a title (and a mark after it), a line or two under it, something on the right. */
export function Row({
  left,
  title,
  badge,
  subtitle,
  lines = 1,
  right,
  onPress,
  chevron,
  label,
  tint,
}: {
  left?: ReactNode;
  title: string;
  badge?: ReactNode;
  subtitle?: string | null;
  lines?: number;
  right?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  label?: string;
  /** The title's colour, for a row that is an action ("Add cash"). */
  tint?: string;
}) {
  const body = (
    <>
      {left}
      <View style={group.text}>
        <View style={group.titleLine}>
          <Text style={[group.title, tint ? { color: tint } : null]} numberOfLines={1}>
            {title}
          </Text>
          {badge}
        </View>
        {subtitle ? (
          <Text style={group.subtitle} numberOfLines={lines}>
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
  titleLine: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  title: { flexShrink: 1, fontFamily: font.bodyBold, fontSize: type.body, color: color.white },
  subtitle: { marginTop: space.hair, fontFamily: font.body, fontSize: type.caption, lineHeight: leading.caption, color: color.faint },
});

/* ---- icons, drawn on one 24-unit grid with one stroke ---- */

const GLYPHS = {
  back: "M19 12H5M11 18l-6-6 6-6",
  close: "M18 6L6 18M6 6l12 12",
  delete: "M10 5h10a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H10l-7-7 7-7zM17 9.5l-5 5M12 9.5l5 5",
  chevron: "M9 6l6 6-6 6",
  out: "M8 16L16 8M9.5 8H16v6.5",
  check: "M5 12.5l4.5 4.5L19 7.5",
  copy: "M9 9h10a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5",
  paste: "M9.5 3.5h5a1 1 0 0 1 1 1V6a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1zM8.5 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-1.5",
  plus: "M12 5v14M5 12h14",
  wallet: "M19 8V6.5A1.5 1.5 0 0 0 17.5 5h-11A2.5 2.5 0 0 0 4 7.5v9A2.5 2.5 0 0 0 6.5 19h12a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18.5 8H6.5A2.5 2.5 0 0 1 4 5.5M16 13.5h.01",
} as const;

function Glyph({ d, size: s = size.glyph, tint = color.faint, fill = "none" }: { d: string; size?: number; tint?: string; fill?: string }) {
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24" fill={fill} stroke={tint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={d} />
    </Svg>
  );
}

export const Chevron = ({ tint }: { tint?: string }) => <Glyph d={GLYPHS.chevron} size={size.glyphRow} tint={tint} />;

export const OutIcon = ({ tint }: { tint?: string }) => <Glyph d={GLYPHS.out} size={size.glyphRow} tint={tint} />;

export const CopyIcon = ({ tint }: { tint?: string }) => <Glyph d={GLYPHS.copy} size={size.badge} tint={tint} />;

/** The orange check after a verified coin's symbol. */
export function Verified({ size: s = size.glyph }: { size?: number }) {
  return (
    <View style={[verified.disc, { width: s, height: s, borderRadius: s / 2 }]} accessible accessibilityLabel="Verified">
      <Svg width={s * 0.66} height={s * 0.66} viewBox="0 0 24 24" fill="none" stroke={color.ink} strokeWidth={3.4} strokeLinecap="round" strokeLinejoin="round">
        <Path d={GLYPHS.check} />
      </Svg>
    </View>
  );
}

const verified = StyleSheet.create({
  disc: { backgroundColor: color.orange, alignItems: "center", justifyContent: "center" },
});
