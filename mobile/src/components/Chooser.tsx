import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { count, usd, viaLine } from "../logic";
import { color, font } from "../theme";
import type { Candidate } from "../types";
import { CoinFace, tap } from "./ui";

/**
 * "WHICH ONE?" A share that names two coins, or a cashtag that a dozen
 * launches share, is asked rather than guessed: the wrong coin under a
 * post about the right one is the one mistake Spot must not make.
 */
export function Chooser({
  title,
  line,
  candidates,
  onPick,
  onBack,
}: {
  title: string;
  line: string;
  candidates: Candidate[];
  onPick: (c: Candidate) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 40 + insets.bottom }]}>
      <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back" style={styles.top}>
        <Text style={styles.back}>←</Text>
      </Pressable>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.line}>{line}</Text>
      {candidates.map((c) => (
        <Pressable
          key={c.token.mint}
          onPress={() => {
            tap();
            onPick(c);
          }}
          style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
          accessibilityRole="button"
          accessibilityLabel={`${c.token.symbol}, ${c.token.name}`}
        >
          <CoinFace uri={c.token.icon} symbol={c.token.symbol} size={46} />
          <View style={styles.cardText}>
            <View style={styles.symbolRow}>
              <Text style={styles.symbol} numberOfLines={1}>
                ${c.token.symbol}
              </Text>
              {c.token.verified && <Text style={styles.verified}>verified</Text>}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {c.token.name}
            </Text>
            <Text style={styles.stats}>
              MC {usd(c.token.mcapUsd)} · Liq {usd(c.token.liquidityUsd)} · {count(c.token.holders)} holders
            </Text>
          </View>
          <Text style={styles.via}>{viaLine(c.via)}</Text>
        </Pressable>
      ))}
      <Text style={styles.foot}>Same name, different coin: check the CA in the post when you can.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  top: { height: 44, justifyContent: "center", alignSelf: "flex-start" },
  back: { fontFamily: font.bodyBold, fontSize: 26, color: color.white, marginTop: -3 },
  title: { marginTop: 10, fontFamily: font.display, fontSize: 44, lineHeight: 46, letterSpacing: -1.2, color: color.white },
  line: { marginTop: 10, marginBottom: 20, fontFamily: font.body, fontSize: 17, lineHeight: 23, color: color.dim },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    marginBottom: 12,
    borderRadius: 20,
    backgroundColor: color.ink2,
    borderWidth: 1,
    borderColor: color.line,
  },
  cardPressed: { backgroundColor: color.ink3 },
  cardText: { flex: 1, minWidth: 0 },
  symbolRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  symbol: { flexShrink: 1, fontFamily: font.display, fontSize: 22, color: color.white },
  verified: {
    fontFamily: font.bodyBold,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    color: color.ink,
    backgroundColor: color.orange,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 999,
    overflow: "hidden",
  },
  name: { marginTop: 1, fontFamily: font.body, fontSize: 14.5, color: color.dim },
  stats: { marginTop: 6, fontFamily: font.mono, fontSize: 12, color: color.faint },
  via: { maxWidth: 84, textAlign: "right", fontFamily: font.bodySemi, fontSize: 12.5, color: color.faint },
  foot: { marginTop: 10, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.faint },
});
