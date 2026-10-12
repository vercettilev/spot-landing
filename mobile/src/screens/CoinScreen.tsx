import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { errorLine, executeOrder, placeOrder, sniffCoin } from "../api";
import { SniffReport, type SniffState } from "../components/SniffReport";
import { Button, CoinFace, Pill, Toggle, tap, useToast } from "../components/ui";
import { forgetHoldings, useHoldings } from "../holdings";
import { DEFAULT_AMOUNT, actionFor, amount as fmtAmount, chipsFor, clampAmount, count, pct, price, shareOf, sourceLine, usd } from "../logic";
import type { RootParams } from "../navigation";
import { useStore } from "../store";
import { color, font } from "../theme";
import { signTransaction, walletError } from "../wallet/mwa";

type Props = NativeStackScreenProps<RootParams, "Coin">;

const SELL_SHARES = [25, 50, 100];

/**
 * A COIN: the landing's buy sheet, and its sell side when the wallet holds
 * it. The sniff fills in while Jupiter answers, and its fresh numbers
 * replace the ones the share came with. Buying goes through the wallet on
 * the phone (Seed Vault, Phantom): Spot asks the server for an order, the
 * wallet signs it in its own screen, Jupiter lands it. Until the server
 * opens trading, the button says so instead.
 */
export function CoinScreen({ navigation, route }: Props) {
  const { candidate, source, share, others } = route.params;
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [toastNode, toast] = useToast();
  const [sniff, setSniff] = useState<SniffState>({ status: "loading" });
  const [side, setSide] = useState<"buy" | "sell">("buy");
  const [amount, setAmount] = useState(store.settings.defaultAmount || DEFAULT_AMOUNT);
  const [sellPct, setSellPct] = useState(50);
  const [tp, setTp] = useState(store.settings.tpDefault);
  const [busy, setBusy] = useState(false);
  const run = useRef(0);

  const wallet = store.wallet;
  const bag = useHoldings(wallet?.address ?? null);
  const done = sniff.status === "done" ? sniff.sniff : null;
  const coin = done?.token ?? candidate.token;
  const position = bag.value?.positions.find((p) => p.token.mint === coin.mint) ?? null;

  const sniffNow = useCallback(async () => {
    const id = ++run.current;
    setSniff({ status: "loading" });
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await sniffCoin(candidate.token.mint, DEFAULT_AMOUNT);
      if (id !== run.current) return;
      if (!res.ok) {
        setSniff({ status: "error", error: res.error });
        return;
      }
      if (res.value.level !== "unknown" || attempt === 1) {
        setSniff({ status: "done", sniff: res.value });
        store.recordSniff(res.value);
        if (res.value.level === "warn" && res.value.maxBuyUsdc !== null) setAmount((a) => clampAmount(a, res.value.maxBuyUsdc));
        return;
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidate.token.mint]);

  useEffect(() => {
    void sniffNow();
    return () => {
      run.current++;
    };
  }, [sniffNow]);

  const blocked = done?.level === "block";
  const restricted = store.settings.usPerson && coin.restrictions.includes("us-persons");
  const cap = done?.level === "warn" ? done.maxBuyUsdc : null;
  const chips = chipsFor(cap);
  const up = (coin.change24hPct ?? 0) >= 0;
  const watched = store.isWatched(coin.mint);
  const sellUsd = position ? Math.round(position.usd * sellPct) / 100 : 0;

  const action =
    side === "sell"
      ? { label: busy ? "Selling…" : `Sell ${sellPct}%${position ? ` · ~${usd(sellUsd)}` : ""}`, enabled: Boolean(position) && !busy, tone: "go" as const }
      : restricted
        ? { label: "Not for US persons", enabled: false, tone: "stop" as const }
        : busy
          ? { label: "Aping…", enabled: false, tone: "wait" as const }
          : actionFor(sniff.status === "done" ? sniff.sniff.level : sniff.status, amount);

  async function trade() {
    if (side === "buy" && (sniff.status === "error" || done?.level === "unknown")) {
      void sniffNow();
      return;
    }
    if (!wallet) {
      navigation.navigate("Connect");
      return;
    }
    if (wallet.kind !== "mwa") {
      toast("You're watching this wallet. Connect one that can sign to trade.");
      return;
    }
    setBusy(true);
    try {
      const order = await placeOrder(
        side === "buy"
          ? { mint: coin.mint, side, taker: wallet.address, amountUsdc: amount }
          : { mint: coin.mint, side, taker: wallet.address, amountRaw: shareOf(position?.raw ?? "0", sellPct) },
      );
      if (!order.ok) {
        const said = typeof order.detail?.message === "string" ? order.detail.message : null;
        toast(order.error === "trading_closed" ? "Buying opens soon. The sniff is free until then." : (said ?? errorLine(order.error)));
        return;
      }
      const signed = await signTransaction(order.value.transaction, wallet.authToken);
      if (signed.authToken !== wallet.authToken) store.setWallet({ ...wallet, authToken: signed.authToken });
      const landed = await executeOrder(order.value.requestId, signed.signed);
      if (!landed.ok || landed.value.status !== "Success") {
        toast(landed.ok ? `Didn't land: ${landed.value.error ?? "try again"}.` : errorLine(landed.error));
        return;
      }
      forgetHoldings(wallet.address);
      void bag.refresh();
      const text = side === "buy" ? `Aped ${amount} USDC of $${coin.symbol}${tp ? " · TP 50% at 2x" : ""}` : `Sold ${sellPct}% of $${coin.symbol}`;
      store.addActivity({ kind: side === "buy" ? "ape" : "sell", mint: coin.mint, symbol: coin.symbol, text, signature: landed.value.signature });
      if (side === "buy" && tp && !watched) store.toggleWatch(coin);
      toast(`${text}.`);
    } catch (e) {
      toast(walletError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 150 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.source} numberOfLines={1}>
            {source && share ? sourceLine(source, share) : ""}
          </Text>
          <Pressable
            onPress={() => {
              tap();
              store.toggleWatch(coin);
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={watched ? "Stop watching" : "Watch"}
          >
            <Text style={[styles.star, watched && styles.starOn]}>{watched ? "★" : "☆"}</Text>
          </Pressable>
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
          <Pressable
            onPress={() =>
              navigation.navigate("Choose", {
                title: "Not this one?",
                line: `Other coins in that share${source && share ? `, ${sourceLine(source, share)}` : ""}.`,
                candidates: others,
                source,
                share,
                current: candidate,
              })
            }
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.notThis}>Not this one? {others.length === 1 ? "1 more coin" : `${others.length} more coins`} in that share</Text>
          </Pressable>
        )}

        {/* The Buy / Sell switch stays live on a blocked coin: Spot refuses the
            buy, never the way out of a bag already held. */}
        <View style={styles.side}>
          {(["buy", "sell"] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                tap();
                setSide(s);
              }}
              style={[styles.sideItem, side === s && styles.sideOn]}
              accessibilityRole="button"
              accessibilityState={{ selected: side === s }}
            >
              <Text style={[styles.sideText, side === s && styles.sideTextOn]}>{s === "buy" ? "Buy" : "Sell"}</Text>
            </Pressable>
          ))}
        </View>

        <View style={[blocked && side === "buy" && styles.off, { pointerEvents: blocked && side === "buy" ? "none" : "auto" }]}>
          {side === "buy" ? (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.amount}>{amount}</Text>
                <Text style={styles.unit}>USDC</Text>
              </View>
              <View style={styles.chips}>
                {chips.map((c) => (
                  <Pill key={c} label={String(c)} on={c === amount} onPress={() => setAmount(c)} />
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
            </>
          ) : position ? (
            <>
              <View style={styles.amountRow}>
                <Text style={styles.amount}>{sellPct}%</Text>
                <Text style={styles.unit}>of your bag</Text>
              </View>
              <View style={styles.chips}>
                {SELL_SHARES.map((p) => (
                  <Pill key={p} label={p === 100 ? "All" : `${p}%`} on={p === sellPct} onPress={() => setSellPct(p)} />
                ))}
              </View>
              <Text style={styles.held}>
                You hold {fmtAmount(position.amount)} ${coin.symbol}, about {usd(position.usd)}. Sold into USDC.
              </Text>
            </>
          ) : (
            <Text style={styles.held}>
              {wallet ? `No $${coin.symbol} in this wallet to sell.` : "Connect a wallet to see and sell what you hold."}
            </Text>
          )}
        </View>

        <View style={styles.report}>
          <SniffReport state={sniff} onRetry={() => void sniffNow()} />
        </View>
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 14 + insets.bottom }]}>
        <Button label={action.label} kind={action.tone} disabled={!action.enabled} onPress={() => void trade()} />
        <Text style={styles.barNote}>
          {side === "buy" && blocked
            ? "Sniff something else: share another post."
            : sniff.status === "loading" && side === "buy"
              ? "Checking the exit, the keys and the crowd."
              : wallet?.kind === "mwa"
                ? "Your wallet signs every trade. Spot never holds a key."
                : "Free sniff. Connect a wallet to trade."}
        </Text>
      </View>
      {toastNode}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 8 },
  top: { flexDirection: "row", alignItems: "center", gap: 14, height: 44 },
  back: { fontFamily: font.bodyBold, fontSize: 26, color: color.white, marginTop: -3 },
  source: { flex: 1, fontFamily: font.bodySemi, fontSize: 15, color: color.dim },
  star: { fontSize: 26, color: color.faint },
  starOn: { color: color.orange },
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
  off: { opacity: 0.35 },
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
  capHint: { marginTop: 10, fontFamily: font.bodySemi, fontSize: 14, color: "#ffb08a" },
  held: { marginTop: 14, fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.dim },
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
