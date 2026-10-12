import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from "react-native";
import { SvgXml } from "react-native-svg";
import { ICON_SVG, WORDMARK_SVG } from "../art";
import { color, font, tone } from "../theme";
import type { Status } from "../types";

/* The small parts every screen shares: the marks, the buttons, the chips,
   a coin's face, and a tap that can be felt. */

export const tap = () => {
  if (Platform.OS !== "web") Haptics.selectionAsync().catch(() => {});
};

export const thud = () => {
  if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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

/** An answer on the sniff report: "No", "Only 38", "Exit −23%". */
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

/** A line that rises from the bottom for a few seconds. */
export function useToast(): [ReactNode, (message: string) => void] {
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
        { pointerEvents: "none" },
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
});
