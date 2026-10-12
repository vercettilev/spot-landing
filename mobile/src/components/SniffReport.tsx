import { Pressable, StyleSheet, Text, View } from "react-native";
import { errorLine, type ApiError } from "../api";
import { ordered } from "../logic";
import { color, font } from "../theme";
import type { Sniff } from "../types";
import { Answer, Breathing } from "./ui";

export type SniffState = { status: "loading" } | { status: "done"; sniff: Sniff } | { status: "error"; error: ApiError };

const WAITING = ["Honeypot?", "Freeze revoked?", "Mint revoked?", "Enough holders?"];

/**
 * THE PAPER, as on the landing: a white report turned a hair off square,
 * the questions down the left, the answers on chips, and a stamp when the
 * puppy growls (GRRR) or refuses (NOPE).
 */
export function SniffReport({ state, onRetry }: { state: SniffState; onRetry: () => void }) {
  const time = state.status === "done" ? new Date(state.sniff.checkedAt) : null;
  return (
    <View style={styles.paper} accessibilityLabel="Sniff report">
      <View style={styles.head}>
        <Text style={styles.kicker}>Sniff report</Text>
        <Text style={styles.kicker}>
          {time ? `${String(time.getHours()).padStart(2, "0")}:${String(time.getMinutes()).padStart(2, "0")}` : "live"}
        </Text>
      </View>

      {state.status === "loading" && (
        <>
          <Breathing>
            <Text style={styles.headline}>Sniffing the CA…</Text>
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
          <Pressable onPress={onRetry} style={styles.retry} accessibilityRole="button">
            <Text style={styles.retryText}>Sniff again</Text>
          </Pressable>
        </>
      )}

      {state.status === "done" && (
        <>
          <Text style={styles.headline}>{state.sniff.headline}</Text>
          {ordered(state.sniff.checks).map((c) => (
            <View key={c.id} style={styles.row}>
              <View style={styles.labelCol}>
                <Text style={styles.label}>{c.label}</Text>
                {c.note && c.status !== "good" ? <Text style={styles.note}>{c.note}</Text> : null}
              </View>
              <Answer status={c.status}>{c.answer}</Answer>
            </View>
          ))}
          {state.sniff.roundTrip && (
            <Text style={styles.trip}>
              Round trip {state.sniff.roundTrip.inUsdc} → {state.sniff.roundTrip.outUsdc} USDC
            </Text>
          )}
          {state.sniff.level === "warn" && <Text style={[styles.stamp, styles.grrr]}>GRRR</Text>}
          {state.sniff.level === "block" && <Text style={[styles.stamp, styles.nope]}>NOPE</Text>}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: {
    backgroundColor: color.white,
    borderRadius: 8,
    paddingHorizontal: 20,
    paddingTop: 22,
    paddingBottom: 18,
    transform: [{ rotate: "-0.8deg" }],
    boxShadow: "0px 18px 36px rgba(0, 0, 0, 0.45)",
  },
  head: { flexDirection: "row", justifyContent: "space-between" },
  kicker: {
    fontFamily: font.mono,
    fontSize: 12,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    color: color.paperDim,
  },
  headline: {
    marginTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#bdb7ab",
    fontFamily: font.display,
    fontSize: 24,
    lineHeight: 28,
    letterSpacing: -0.4,
    color: color.ink,
  },
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
    right: -6,
    bottom: -14,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: 3,
    borderRadius: 8,
    fontFamily: font.display,
    fontSize: 30,
    letterSpacing: 1.5,
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    transform: [{ rotate: "-13deg" }],
  },
  grrr: { color: "#c7372b", borderColor: "#c7372b" },
  nope: { color: "#b42d22", borderColor: "#b42d22" },
  errorText: { marginTop: 12, fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.paperDim },
  retry: { alignSelf: "flex-start", marginTop: 14, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: color.ink },
  retryText: { fontFamily: font.bodyBold, fontSize: 15, color: color.white },
});
