import { useEffect, useRef, useState } from "react";
import { Animated, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { errorLine, type ApiError } from "../api";
import { foldChecks, moreChecks, ordered, verdictHead } from "../logic";
import { color, font, leading, motion, radius, shadow, size, space, stamp, tracking, type } from "../theme";
import type { Sniff } from "../types";
import { Answer, Breathing, Chevron, feel, tap, useReducedMotion } from "./ui";

export type SniffState =
  | { status: "reading"; title: string; line: string | null }
  | { status: "loading" }
  | { status: "done"; sniff: Sniff }
  | { status: "error"; error: ApiError };

const WAITING = ["Honeypot?", "Dev can freeze it?", "Dev can print more?", "Enough holders?"];
const MAX_ROWS = 12;
const STAMP = { ok: "CLEAN", warn: "GRRR", block: "NOPE" } as const;
const FEEL = { ok: "success", warn: "warning", block: "error" } as const;
const native = Platform.OS !== "web";

/**
 * THE RECEIPT, as on the landing: a white report turned a hair off square.
 * The stamp comes first, where the eye lands: CLEAN, GRRR or NOPE, then one
 * line on what it means for the bag, then only the questions that didn't
 * come back clean; the clean ones fold under one line, there to open.
 * While the sniff runs, the stamp's place waits empty, so nothing
 * jumps when the answer lands; before there is even a coin, it shows what
 * is being read (a post, a screenshot) the same way. This is the app's one
 * orchestrated moment:
 * the checks tick in one after another, the stamp comes down and the phone
 * feels which one it was. Reduced motion skips straight to the result.
 */
export function SniffReport({ state, onRetry }: { state: SniffState; onRetry?: () => void }) {
  const rows = useRef(Array.from({ length: MAX_ROWS }, () => new Animated.Value(0))).current;
  const thump = useRef(new Animated.Value(0)).current;
  const reduced = useReducedMotion();
  const done = state.status === "done" ? state.sniff : null;
  const key = done ? `${done.mint}:${done.checkedAt}` : null;
  /* The clean checks, folded until asked for. */
  const [open, setOpen] = useState(false);
  const fold = done ? foldChecks(done.checks) : null;

  useEffect(() => {
    if (!done) return;
    let cancelled = false;
    setOpen(false);
    /* The stamp lands right after the last row that shows. */
    const count = Math.min(foldChecks(done.checks).shown.length, MAX_ROWS);
    const verdict = done.level === "unknown" ? null : done.level;
    rows.forEach((v) => v.setValue(0));
    thump.setValue(0);
    if (reduced) {
      rows.forEach((v) => v.setValue(1));
      thump.setValue(1);
      if (verdict) feel(FEEL[verdict]);
      return;
    }
    Animated.stagger(
      motion.stagger,
      rows.slice(0, count).map((v) => Animated.timing(v, { toValue: 1, duration: motion.tick, useNativeDriver: native })),
    ).start(() => {
      if (cancelled || !verdict) return;
      feel(FEEL[verdict]);
      Animated.spring(thump, { toValue: 1, ...motion.thump, useNativeDriver: native }).start();
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const verdict = done && done.level !== "unknown" ? done.level : null;
  return (
    <View style={styles.paper} accessibilityLabel="Sniff report">

      {state.status === "reading" && (
        <View accessible accessibilityLabel={state.title}>
          <Breathing style={styles.slot}>
            <View style={styles.slotEmpty} />
          </Breathing>
          <Breathing style={styles.reading}>
            <Text style={styles.headline}>{state.title}</Text>
          </Breathing>
          {state.line ? (
            <Text style={styles.readingLine} numberOfLines={2}>
              {state.line}
            </Text>
          ) : null}
        </View>
      )}

      {state.status === "loading" && (
        <>
          <Breathing style={styles.slot}>
            <View style={styles.slotEmpty} />
          </Breathing>
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
          <Text style={styles.headline}>Couldn't sniff it.</Text>
          <Text style={styles.errorText}>{errorLine(state.error)}</Text>
          {onRetry ? (
            <Pressable onPress={onRetry} style={styles.retry} hitSlop={{ top: space.hair, bottom: space.hair }} accessibilityRole="button">
              <Text style={styles.retryText}>Sniff again</Text>
            </Pressable>
          ) : null}
        </>
      )}

      {done && (
        <>
          {verdict ? (
            <View style={styles.slot} accessible accessibilityLabel={`Verdict: ${STAMP[verdict]}`}>
              <Animated.Text
                style={[
                  styles.stamp,
                  { color: stamp[verdict], borderColor: stamp[verdict] },
                  {
                    opacity: thump.interpolate({ inputRange: [0, 0.25, 1], outputRange: [0, 1, 1] }),
                    transform: [{ rotate: "-7deg" }, { scale: thump.interpolate({ inputRange: [0, 1], outputRange: [1.9, 1] }) }],
                  },
                ]}
              >
                {STAMP[verdict]}
              </Animated.Text>
            </View>
          ) : null}
          <View style={[styles.verdict, !verdict && styles.verdictBare]}>
            <Text style={styles.headline}>{verdictHead(done.level, done.headline)}</Text>
          </View>
          {(open ? ordered(done.checks) : (fold?.shown ?? [])).map((c, i) => {
            const v = rows[Math.min(i, MAX_ROWS - 1)]!;
            return (
              <Animated.View
                key={c.id}
                style={[styles.row, { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [space.x2, 0] }) }] }]}
              >
                <View style={styles.labelCol}>
                  <Text style={styles.label}>{c.label}</Text>
                  {c.note && c.status !== "good" ? <Text style={styles.note}>{c.note}</Text> : null}
                </View>
                <Answer status={c.status}>{c.answer}</Answer>
              </Animated.View>
            );
          })}
          {fold && fold.folded.length > 0 && !open ? (
            <Pressable
              onPress={() => {
                tap();
                setOpen(true);
                /* Rows past the fold were never ticked in: they arrive now. */
                rows.forEach((v) => Animated.timing(v, { toValue: 1, duration: motion.tick, useNativeDriver: native }).start());
              }}
              style={styles.more}
              accessibilityRole="button"
              accessibilityLabel={`${moreChecks(fold.folded.length, fold.shown.length === 0)}. Show them`}
            >
              <View style={styles.moreLine}>
                <View style={styles.clear}>
                  <Svg width={space.x3} height={space.x3} viewBox="0 0 24 24" fill="none" stroke={color.white} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round">
                    <Path d="M5 12.5l4.5 4.5L19 7.5" />
                  </Svg>
                </View>
                <Text style={styles.moreText}>{moreChecks(fold.folded.length, fold.shown.length === 0)}</Text>
              </View>
              <View style={styles.moreShow}>
                <Text style={styles.moreShowText}>Show</Text>
                <View style={styles.down}>
                  <Chevron tint={color.paperDim} />
                </View>
              </View>
            </Pressable>
          ) : null}
          {/* Only a test trade that ran is worth a line: "no test trade needed" asked readers whether they should run one. */}
          {done.roundTrip ? (
            <Text style={styles.trip}>
              Test trade: ${money(done.roundTrip.inUsdc)} in, ${money(done.roundTrip.outUsdc)} back
            </Text>
          ) : null}
        </>
      )}
    </View>
  );
}

/* $25 or $24.95: whole dollars stay whole. */
const money = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));

/* The stamp's box: its word set in the stamp's size, padded, inside a 3-point border. */
const STAMP_BORDER = 3;
const SLOT = { width: 132, height: leading.stamp + 2 * space.hair + 2 * STAMP_BORDER };

const styles = StyleSheet.create({
  paper: {
    backgroundColor: color.white,
    borderRadius: radius.paper,
    paddingHorizontal: space.x5,
    paddingTop: space.x5,
    paddingBottom: space.x5,
    transform: [{ rotate: "-0.8deg" }],
    boxShadow: shadow.paper,
  },
  slot: { height: SLOT.height, justifyContent: "center", alignItems: "flex-start" },
  slotEmpty: {
    width: SLOT.width,
    height: SLOT.height,
    borderRadius: radius.paper,
    borderWidth: 2,
    borderStyle: "dashed",
    borderColor: color.paperRule,
    transform: [{ rotate: "-7deg" }],
  },
  stamp: {
    paddingHorizontal: space.x3,
    paddingVertical: space.hair,
    borderWidth: STAMP_BORDER,
    borderRadius: radius.paper,
    fontFamily: font.display,
    fontSize: type.stamp,
    lineHeight: leading.stamp,
    letterSpacing: tracking.stamp,
    backgroundColor: color.stampGround,
    overflow: "hidden",
  },
  verdict: { marginTop: space.x3, paddingBottom: space.x4, borderBottomWidth: 1.5, borderStyle: "dashed", borderColor: color.paperRule },
  verdictBare: { marginTop: space.x3 },
  reading: { marginTop: space.x3 },
  readingLine: { marginTop: space.x2, marginBottom: space.x1, fontFamily: font.mono, fontSize: type.footnote, lineHeight: leading.footnote, color: color.paperDim },
  headline: { fontFamily: font.display, fontSize: type.headline, lineHeight: leading.headline, letterSpacing: tracking.headline, color: color.ink },
  line: { marginTop: space.x2, fontFamily: font.body, fontSize: type.callout, lineHeight: leading.callout, color: color.paperDim },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: space.x3,
    paddingVertical: space.x3,
    borderBottomWidth: size.hairline,
    borderColor: color.paperHair,
  },
  labelCol: { flex: 1 },
  label: { fontFamily: font.bodySemi, fontSize: type.body, color: color.paperInk },
  note: { marginTop: space.hair, fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.paperDim },
  pending: { width: space.x14, height: space.x7, borderRadius: radius.pill, backgroundColor: color.paperWell },
  more: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: size.tap, borderBottomWidth: size.hairline, borderColor: color.paperHair },
  moreLine: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  clear: { width: space.x5, height: space.x5, borderRadius: space.x5 / 2, backgroundColor: stamp.ok, alignItems: "center", justifyContent: "center" },
  moreText: { fontFamily: font.bodySemi, fontSize: type.callout, color: color.paperInk },
  moreShow: { flexDirection: "row", alignItems: "center", gap: space.x1 },
  moreShowText: { fontFamily: font.bodyBold, fontSize: type.callout, color: color.paperInk },
  down: { transform: [{ rotate: "90deg" }] },
  trip: { marginTop: space.x4, fontFamily: font.mono, fontSize: type.footnote, color: color.paperDim },
  errorText: { marginTop: space.x3, fontFamily: font.body, fontSize: type.callout, lineHeight: leading.callout, color: color.paperDim },
  retry: { alignSelf: "flex-start", marginTop: space.x4, minHeight: size.chip, justifyContent: "center", paddingHorizontal: space.x4, borderRadius: radius.pill, backgroundColor: color.ink },
  retryText: { fontFamily: font.bodyBold, fontSize: type.callout, color: color.white },
});
