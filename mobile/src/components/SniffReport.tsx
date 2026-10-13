import { useEffect, useRef } from "react";
import { AccessibilityInfo, Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { errorLine, type ApiError } from "../api";
import { ordered, verdictLine } from "../logic";
import { color, font, stamp } from "../theme";
import type { Sniff } from "../types";
import { Answer, Breathing, feel } from "./ui";

export type SniffState = { status: "loading" } | { status: "done"; sniff: Sniff } | { status: "error"; error: ApiError };

const WAITING = ["Honeypot?", "Dev can freeze it?", "Dev can print more?", "Enough holders?"];
const MAX_ROWS = 12;
const STAMP = { ok: "CLEAN", warn: "GRRR", block: "NOPE" } as const;
const FEEL = { ok: "success", warn: "warning", block: "error" } as const;

/**
 * THE RECEIPT, as on the landing: a white report turned a hair off square.
 * The verdict comes first with one line on what it means for the bag; the
 * questions under it are the proof. This is the app's one orchestrated
 * moment: when the answer lands, the checks tick in one after another, the
 * stamp comes down (CLEAN, GRRR or NOPE) and the phone feels which one it
 * was. Reduced motion skips straight to the result.
 */
export function SniffReport({ state, onRetry }: { state: SniffState; onRetry: () => void }) {
  const rows = useRef(Array.from({ length: MAX_ROWS }, () => new Animated.Value(0))).current;
  const thump = useRef(new Animated.Value(0)).current;
  const done = state.status === "done" ? state.sniff : null;
  const key = done ? `${done.mint}:${done.checkedAt}` : null;

  useEffect(() => {
    if (!done) return;
    let cancelled = false;
    const native = Platform.OS !== "web";
    const count = Math.min(done.checks.length, MAX_ROWS);
    const verdict = done.level === "unknown" ? null : done.level;
    rows.forEach((v) => v.setValue(0));
    thump.setValue(0);
    const land = () => {
      if (cancelled || !verdict) return;
      feel(FEEL[verdict]);
      Animated.spring(thump, { toValue: 1, friction: 6, tension: 170, useNativeDriver: native }).start();
    };
    AccessibilityInfo.isReduceMotionEnabled()
      .catch(() => false)
      .then((reduce) => {
        if (cancelled) return;
        if (reduce) {
          rows.forEach((v) => v.setValue(1));
          thump.setValue(1);
          if (verdict) feel(FEEL[verdict]);
          return;
        }
        Animated.stagger(
          70,
          rows.slice(0, count).map((v) => Animated.timing(v, { toValue: 1, duration: 220, useNativeDriver: native })),
        ).start(land);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const time = done ? new Date(done.checkedAt) : null;
  return (
    <View style={[styles.paper, done && done.level !== "unknown" && styles.stamped]} accessibilityLabel="Sniff report">
      <View style={styles.head}>
        <Text style={styles.kicker}>Sniff report</Text>
        <Text style={styles.kicker}>
          {time ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}` : "live"}
        </Text>
      </View>

      {state.status === "loading" && (
        <>
          <Breathing style={styles.verdict}>
            <Text style={styles.headline}>Sniffing for scams…</Text>
            <Text style={styles.line}>Can you sell it? Can the dev freeze it? A few seconds.</Text>
          </Breathing>
          {WAITING.map((label) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <View style={styles.pending} />
            </View>
          ))}
        </>
      )}

      {state.status === "error" && (
        <>
          <Text style={[styles.headline, styles.errorHead]}>Couldn't sniff it.</Text>
          <Text style={styles.errorText}>{errorLine(state.error)}</Text>
          <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>Sniff again</Text>
          </Pressable>
        </>
      )}

      {done && (
        <>
          <View style={styles.verdict}>
            <Text style={styles.headline}>{done.headline}</Text>
            <Text style={styles.line}>{verdictLine(done)}</Text>
          </View>
          {ordered(done.checks).map((c, i) => {
            const v = rows[Math.min(i, MAX_ROWS - 1)]!;
            return (
              <Animated.View
                key={c.id}
                style={[styles.row, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) }] }]}
              >
                <View style={styles.labelCol}>
                  <Text style={styles.label}>{c.label}</Text>
                  {c.note && c.status !== "good" ? <Text style={styles.note}>{c.note}</Text> : null}
                </View>
                <Answer status={c.status}>{c.answer}</Answer>
              </Animated.View>
            );
          })}
          {done.roundTrip ? (
            <Text style={styles.trip}>
              Test trade: ${money(done.roundTrip.inUsdc)} in, ${money(done.roundTrip.outUsdc)} back
            </Text>
          ) : done.level === "ok" ? (
            <Text style={styles.trip}>Blue chip. No test trade needed.</Text>
          ) : null}
          {done.level !== "unknown" && (
            <Animated.Text
              style={[
                styles.stamp,
                { color: stamp[done.level], borderColor: stamp[done.level] },
                {
                  opacity: thump.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
                  transform: [{ rotate: "-13deg" }, { scale: thump.interpolate({ inputRange: [0, 1], outputRange: [1.9, 1] }) }],
                },
              ]}
            >
              {STAMP[done.level]}
            </Animated.Text>
          )}
        </>
      )}
    </View>
  );
}

/* $25 or $24.95: whole dollars stay whole. */
const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

const styles = StyleSheet.create({
  paper: {
    backgroundColor: color.white,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 18,
    transform: [{ rotate: "-0.8deg" }],
    boxShadow: "0px 22px 44px rgba(0, 0, 0, 0.6)",
  },
  stamped: { paddingBottom: 40 },
  head: { flexDirection: "row", justifyContent: "space-between" },
  kicker: { fontFamily: font.mono, fontSize: 12, letterSpacing: 0.8, textTransform: "uppercase", color: color.paperDim },
  verdict: { marginTop: 10, paddingBottom: 16, borderBottomWidth: 1.5, borderStyle: "dashed", borderColor: "#bdb7ab" },
  headline: { fontFamily: font.display, fontSize: 25, lineHeight: 29, letterSpacing: -0.4, color: color.ink },
  line: { marginTop: 6, fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.paperDim },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderColor: "#eee9df",
  },
  labelCol: { flex: 1 },
  label: { fontFamily: font.bodySemi, fontSize: 16, color: color.paperInk },
  note: { marginTop: 3, fontFamily: font.body, fontSize: 13.5, lineHeight: 18, color: color.paperDim },
  pending: { width: 54, height: 26, borderRadius: 999, backgroundColor: "#ecebe7" },
  trip: { marginTop: 14, fontFamily: font.mono, fontSize: 13, color: color.paperDim },
  stamp: {
    position: "absolute",
    right: -4,
    bottom: -16,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 3,
    borderRadius: 8,
    fontFamily: font.display,
    fontSize: 30,
    letterSpacing: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
  },
  errorHead: { marginTop: 10 },
  errorText: { marginTop: 10, fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.paperDim },
  retry: { alignSelf: "flex-start", marginTop: 14, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: color.ink },
  retryText: { fontFamily: font.bodyBold, fontSize: 15, color: color.white },
});
