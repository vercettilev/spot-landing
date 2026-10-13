import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { errorLine, resolveShare, type ApiError } from "../api";
import { Status } from "../components/Status";
import { SniffReport } from "../components/SniffReport";
import { Breathing, Button, Dock, IconButton } from "../components/ui";
import { sourceLine } from "../logic";
import type { RootParams } from "../navigation";
import { color, font, leading, radius, size, space, type } from "../theme";
import type { ResolveResult, Share } from "../types";

type Props = NativeStackScreenProps<RootParams, "Resolve">;

function whichLine(r: ResolveResult, share: Share): string {
  const from = sourceLine(r.source, share);
  const symbols = new Set(r.candidates.map((c) => c.token.symbol.toLowerCase()));
  if (symbols.size === 1 && r.candidates[0]?.via === "cashtag") {
    return `$${r.candidates[0].token.symbol} is ${r.candidates.length} different coins. Pick the one ${from.replace(/^from /, "")} meant.`;
  }
  if (r.candidates.every((c) => c.via === "name")) return "Spot found a name, not a CA. Is it one of these?";
  return `${r.candidates.length} coins in there, ${from}. Pick one.`;
}

/**
 * READING A SHARE. The post or the paste goes to /api/resolve; one coin
 * opens it, several ask which, none says so. While it reads, the screen is
 * already the coin's, unfilled: the same top, the same receipt, the same
 * key, so the coin fades in over its own outline instead of arriving. It is
 * replaced by what it finds, so back from the coin goes where the share
 * began.
 */
export function ResolveScreen({ navigation, route }: Props) {
  const { share } = route.params;
  const [state, setState] = useState<{ kind: "reading" } | { kind: "none"; unread: boolean } | { kind: "failed"; error: ApiError }>({ kind: "reading" });
  const run = useRef(0);

  const read = useCallback(async () => {
    const id = ++run.current;
    setState({ kind: "reading" });
    if (share.from === "screenshot" && !share.text) {
      setState({ kind: "none", unread: true });
      return;
    }
    const res = await resolveShare(share);
    if (id !== run.current) return;
    if (!res.ok) {
      setState({ kind: "failed", error: res.error });
      return;
    }
    const r = res.value;
    if (r.status === "found" && r.pick) {
      const pick = r.pick;
      navigation.replace("Coin", { candidate: pick, source: r.source, share, others: r.candidates.filter((c) => c.token.mint !== pick.token.mint), continues: true });
    } else if (r.status === "ambiguous" && r.candidates.length) {
      navigation.replace("Choose", { title: "Which one?", line: whichLine(r, share), candidates: r.candidates, source: r.source, share, continues: true });
    } else {
      setState({ kind: "none", unread: r.missed.includes("post") });
    }
  }, [navigation, share]);

  useEffect(() => {
    void read();
    return () => {
      run.current++;
    };
  }, [read]);

  if (state.kind === "reading") {
    return (
      <Reading
        title={share.from === "screenshot" ? "Reading the screenshot…" : share.url ? "Reading the post…" : "Finding the coin…"}
        line={share.url ?? share.text ?? null}
        onBack={() => navigation.goBack()}
      />
    );
  }
  if (state.kind === "failed") {
    return (
      <Status
        title="Spot couldn't check that."
        line={errorLine(state.error)}
        primary={{ label: "Try again", onPress: () => void read() }}
        secondary={{ label: "Back", onPress: () => navigation.goBack() }}
      />
    );
  }
  const screenshot = share.from === "screenshot";
  return (
    <Status
      title={state.unread ? (screenshot ? "No words in that screenshot." : "Couldn't read that post.") : "No coin in there."}
      line={
        state.unread
          ? screenshot
            ? "Spot reads the words in a screenshot. Use one where the CA or $ticker shows."
            : "It may be private or deleted. Paste the CA or $ticker instead."
          : "Spot looks for a CA, a $ticker or a coin link. Paste one instead?"
      }
      primary={{ label: "Paste one", onPress: () => navigation.goBack() }}
    />
  );
}

/** The coin's screen before there is a coin: its outline, breathing, and the receipt saying what is being read. */
function Reading({ title, line, onBack }: { title: string; line: string | null; onBack: () => void }) {
  const [dockHeight, setDockHeight] = useState<number>(size.key * 2);
  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: dockHeight + space.x6 }]} scrollEnabled={false}>
        <View style={styles.top}>
          <IconButton icon="back" label="Back" onPress={onBack} style={styles.back} />
        </View>
        <Breathing>
          <View style={styles.coin}>
            <View style={styles.face} />
            <View style={styles.coinText}>
              <View style={[styles.bar, styles.barSymbol]} />
              <View style={[styles.bar, styles.barName]} />
            </View>
            <View style={styles.priceCol}>
              <View style={[styles.bar, styles.barPrice]} />
              <View style={[styles.bar, styles.barChange]} />
            </View>
          </View>
          <View style={[styles.bar, styles.barStats]} />
          <View style={[styles.bar, styles.barCa]} />
        </Breathing>
        <View style={styles.report}>
          <SniffReport state={{ status: "reading", title, line }} onRetry={() => {}} />
        </View>
      </ScrollView>
      <Dock onHeight={setDockHeight}>
        <Button label="Finding the coin…" kind="wait" disabled />
        <Text style={styles.note}>Then Spot sniffs it for scams.</Text>
      </Dock>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingTop: space.x2 },
  top: { flexDirection: "row", alignItems: "center", height: size.tap },
  back: { marginLeft: -space.x3 },
  coin: { flexDirection: "row", alignItems: "center", gap: space.x4, marginTop: space.x3 },
  face: { width: size.faceCoin, height: size.faceCoin, borderRadius: size.faceCoin / 2, backgroundColor: color.ink3 },
  coinText: { flex: 1, gap: space.x2 },
  priceCol: { alignItems: "flex-end", gap: space.x2 },
  bar: { borderRadius: radius.paper, backgroundColor: color.ink3 },
  barSymbol: { width: 128, height: type.headline },
  barName: { width: 88, height: type.callout },
  barPrice: { width: 72, height: type.lead },
  barChange: { width: 48, height: type.caption },
  barStats: { width: 132, height: type.caption, marginTop: space.x3 },
  barCa: { width: 168, height: type.footnote, marginVertical: space.x4 },
  report: { marginTop: space.x4 },
  note: { marginTop: space.x2, textAlign: "center", fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
});
