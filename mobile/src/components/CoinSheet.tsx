import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { sniffCoin } from "../api";
import { DEFAULT_AMOUNT, actionFor, chipsFor, clampAmount, count, pct, price, sourceLine, usd } from "../logic";
import { color, font } from "../theme";
import type { Candidate, Share, Source } from "../types";
import { SniffReport, type SniffState } from "./SniffReport";
import { Button, CoinFace, Toggle, tap } from "./ui";

/**
 * THE BUY SHEET from the landing's phone, for real: the coin from the
 * share, an amount in USDC, take profit, and the sniff filling in while
 * Jupiter answers. No wallet yet, so the button says what it will do and
 * the line under it says when.
 */
export function CoinSheet({
  share,
  source,
  pick,
  others,
  onBack,
  onOthers,
  toast,
}: {
  share: Share;
  source: Source;
  pick: Candidate;
  others: Candidate[];
  onBack: () => void;
  onOthers: () => void;
  toast: (message: string) => void;
}) {
  const coin = pick.token;
  const insets = useSafeAreaInsets();
  const [sniff, setSniff] = useState<SniffState>({ status: "loading" });
  const [amount, setAmount] = useState(DEFAULT_AMOUNT);
  const [tp, setTp] = useState(true);
  const run = useRef(0);

  /* One sniff per coin, retried once on its own when a check came back
     unanswered: on Jupiter's free plan a busy second is the usual cause. */
  const sniffNow = useCallback(async () => {
    const id = ++run.current;
    setSniff({ status: "loading" });
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await sniffCoin(coin.mint, DEFAULT_AMOUNT);
      if (id !== run.current) return;
      if (!res.ok) {
        setSniff({ status: "error", error: res.error });
        return;
      }
      if (res.value.level !== "unknown" || attempt === 1) {
        setSniff({ status: "done", sniff: res.value });
        if (res.value.level === "warn" && res.value.maxBuyUsdc !== null) {
          setAmount((a) => clampAmount(a, res.value.maxBuyUsdc));
        }
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
  }, [coin.mint]);

  useEffect(() => {
    void sniffNow();
    return () => {
      run.current++;
    };
  }, [sniffNow]);

  const done = sniff.status === "done" ? sniff.sniff : null;
  const blocked = done?.level === "block";
  const cap = done?.level === "warn" ? done.maxBuyUsdc : null;
  const chips = chipsFor(cap);
  const action = actionFor(sniff.status === "done" ? sniff.sniff.level : sniff.status, amount);
  const up = (coin.change24hPct ?? 0) >= 0;

  function press() {
    if (sniff.status === "error" || done?.level === "unknown") {
      void sniffNow();
      return;
    }
    toast(`Wallet lands in the next build. Then this button buys ${amount} USDC of $${coin.symbol}${tp ? " and sells half at 2x" : ""}.`);
  }

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 150 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={onBack} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.source} numberOfLines={1}>
            {sourceLine(source, share)}
          </Text>
        </View>

        <View style={styles.coin}>
          <CoinFace uri={coin.icon} symbol={coin.symbol} size={56} />
          <View style={styles.coinText}>
            <View style={styles.symbolRow}>
              <Text style={styles.symbol} numberOfLines={1}>
                ${coin.symbol}
              </Text>
              {coin.verified && <Text style={styles.verified}>✓</Text>}
            </View>
            <Text style={styles.name} numberOfLines={1}>
              {coin.kind === "stock" ? `${coin.name} · tokenized stock` : coin.name}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.price}>{price(coin.priceUsd)}</Text>
            <Text style={[styles.change, { color: up ? color.green : color.red }]}>{pct(coin.change24hPct)}</Text>
          </View>
        </View>

        <Text style={styles.stats}>
          MC {usd(coin.mcapUsd)} · Liq {usd(coin.liquidityUsd)} · {count(coin.holders)} holders
        </Text>
        {coin.restrictions.includes("us-persons") && <Text style={styles.restricted}>The issuer doesn't sell to US persons.</Text>}
        {others.length > 0 && (
          <Pressable onPress={onOthers} hitSlop={8} accessibilityRole="button">
            <Text style={styles.notThis}>Not this one? {others.length === 1 ? "1 more coin" : `${others.length} more coins`} in that share</Text>
          </Pressable>
        )}

        {/* A coin Spot will not buy keeps its numbers but loses its controls. */}
        <View style={[blocked && styles.off, { pointerEvents: blocked ? "none" : "auto" }]}>
          <View style={styles.side}>
            <View style={[styles.sideItem, styles.sideOn]}>
              <Text style={[styles.sideText, styles.sideTextOn]}>Buy</Text>
            </View>
            <View style={styles.sideItem}>
              <Text style={styles.sideText}>Sell</Text>
            </View>
          </View>

          <View style={styles.amountRow}>
            <Text style={styles.amount}>{amount}</Text>
            <Text style={styles.unit}>USDC</Text>
          </View>
          <View style={styles.chips}>
            {chips.map((c) => (
              <Pressable
                key={c}
                onPress={() => {
                  tap();
                  setAmount(c);
                }}
                style={[styles.chip, c === amount && styles.chipOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: c === amount }}
              >
                <Text style={[styles.chipText, c === amount && styles.chipTextOn]}>{c}</Text>
              </Pressable>
            ))}
          </View>
          {cap !== null && <Text style={styles.capHint}>Fresh coin: {cap} USDC max.</Text>}

          <View style={styles.tp}>
            <View style={styles.tpText}>
              <Text style={styles.tpTitle}>TP 50% at 2x</Text>
              <Text style={styles.tpNote}>Sells half when it doubles. Initials back.</Text>
            </View>
            <Toggle value={tp} onChange={setTp} label="Take profit: sell half at 2x" />
          </View>
        </View>

        <View style={styles.report}>
          <SniffReport state={sniff} onRetry={() => void sniffNow()} />
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 14 + insets.bottom }]}>
        <Button label={action.label} kind={action.tone} disabled={!action.enabled} onPress={press} />
        <Text style={styles.barNote}>
          {blocked
            ? "Sniff something else: share another post."
            : sniff.status === "loading"
              ? "Checking the exit, the keys and the crowd."
              : "Free sniff. Buying opens with the wallet."}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  top: { flexDirection: "row", alignItems: "center", gap: 14, height: 44 },
  back: { fontFamily: font.bodyBold, fontSize: 26, color: color.white, marginTop: -3 },
  source: { flex: 1, fontFamily: font.bodySemi, fontSize: 15, color: color.dim },
  coin: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 14 },
  coinText: { flex: 1, minWidth: 0 },
  symbolRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  symbol: { flexShrink: 1, fontFamily: font.display, fontSize: 32, letterSpacing: -0.8, color: color.white },
  verified: {
    fontFamily: font.bodyBold,
    fontSize: 12,
    color: color.ink,
    backgroundColor: color.orange,
    width: 20,
    height: 20,
    borderRadius: 10,
    textAlign: "center",
    lineHeight: 20,
    overflow: "hidden",
  },
  name: { marginTop: 2, fontFamily: font.body, fontSize: 15, color: color.dim },
  priceCol: { alignItems: "flex-end" },
  price: { fontFamily: font.displayBold, fontSize: 18, color: color.white },
  change: { marginTop: 2, fontFamily: font.bodyBold, fontSize: 14 },
  stats: { marginTop: 14, fontFamily: font.mono, fontSize: 13, color: color.faint },
  restricted: { marginTop: 8, fontFamily: font.bodySemi, fontSize: 14, color: "#ffb08a" },
  notThis: { marginTop: 10, fontFamily: font.bodySemi, fontSize: 15, color: color.orange },
  side: {
    flexDirection: "row",
    alignSelf: "flex-start",
    marginTop: 26,
    padding: 4,
    borderRadius: 999,
    backgroundColor: color.ink2,
    borderWidth: 1,
    borderColor: color.line,
  },
  sideItem: { paddingVertical: 7, paddingHorizontal: 18, borderRadius: 999 },
  sideOn: { backgroundColor: color.white },
  sideText: { fontFamily: font.bodyBold, fontSize: 15, color: color.faint },
  sideTextOn: { color: color.ink },
  amountRow: { flexDirection: "row", alignItems: "baseline", gap: 10, marginTop: 18 },
  amount: { fontFamily: font.display, fontSize: 72, lineHeight: 76, letterSpacing: -2, color: color.white },
  unit: { fontFamily: font.displayBold, fontSize: 22, color: color.dim },
  chips: { flexDirection: "row", gap: 10, marginTop: 10 },
  chip: {
    minWidth: 64,
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.ink2,
  },
  chipOn: { backgroundColor: color.orange, borderColor: color.orange },
  chipText: { fontFamily: font.bodyBold, fontSize: 16, color: color.white },
  chipTextOn: { color: color.ink },
  capHint: { marginTop: 10, fontFamily: font.bodySemi, fontSize: 14, color: "#ffb08a" },
  tp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 22,
    padding: 16,
    borderRadius: 18,
    backgroundColor: color.ink2,
    borderWidth: 1,
    borderColor: color.line,
  },
  tpText: { flex: 1 },
  tpTitle: { fontFamily: font.bodyBold, fontSize: 17, color: color.white },
  tpNote: { marginTop: 2, fontFamily: font.body, fontSize: 14, color: color.faint },
  off: { opacity: 0.35 },
  report: { marginTop: 30, marginBottom: 12 },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 14,
    paddingHorizontal: 20,
    backgroundColor: "rgba(11, 11, 12, 0.96)",
    borderTopWidth: 1,
    borderColor: color.line,
  },
  barNote: { marginTop: 8, textAlign: "center", fontFamily: font.body, fontSize: 13.5, color: color.faint },
});
