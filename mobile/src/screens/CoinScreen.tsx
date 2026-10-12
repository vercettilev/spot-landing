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
 * A COIN, in the order a first-timer needs it: what it is, whether it is a
 * scam (the sniff report), then how much and the button. The amounts sit
 * right above the button, so a buy is two taps; the Sell side shows only
 * when the wallet holds the coin, and stays open on a coin Spot blocks
 * (Spot refuses the buy, never the way out of a bag already held).
 *
 * A trade goes through the wallet on the phone (Seed Vault, Phantom): Spot
 * asks the server for an order, the wallet asks its owner to approve it,
 * Jupiter lands it. Until the server opens trading, the button says so.
 */
export function CoinScreen({ navigation, route }: Props) {
  const { candidate, source, share, others } = route.params;
  const store = useStore();
  const insets = useSafeAreaInsets();
  const [toastNode, toast] = useToast(200 + insets.bottom);
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

  /* Sold the last of it: back to buying. */
  useEffect(() => {
    if (!position && side === "sell") setSide("buy");
  }, [position, side]);

  const buying = side === "buy";
  const blocked = done?.level === "block";
  const restricted = store.settings.usPerson && coin.restrictions.includes("us-persons");
  const cap = done?.level === "warn" ? done.maxBuyUsdc : null;
  const chips = chipsFor(cap);
  const up = (coin.change24hPct ?? 0) >= 0;
  const watched = store.isWatched(coin.mint);
  const sellUsd = position ? Math.round(position.usd * sellPct) / 100 : 0;
  const canPickAmount = buying ? Boolean(done) && (done!.level === "ok" || done!.level === "warn") && !restricted : Boolean(position);

  const action =
    !buying
      ? { label: busy ? "Selling…" : `Sell ${sellPct === 100 ? "all" : `${sellPct}%`} · ~${usd(sellUsd)}`, enabled: Boolean(position) && !busy, tone: "go" as const }
      : restricted
        ? { label: "Not for US users", enabled: false, tone: "stop" as const }
        : busy
          ? { label: "Aping…", enabled: false, tone: "wait" as const }
          : actionFor(sniff.status === "done" ? sniff.sniff.level : sniff.status, amount);

  const note = !buying
    ? wallet?.kind === "mwa"
      ? "Sells into USDC. Your wallet asks you to approve."
      : "You're only tracking this wallet. Connect yours to sell."
    : sniff.status === "loading"
      ? "Checking it for scams…"
      : blocked
        ? "Share another post to sniff something else."
        : restricted
          ? "Coins like this aren't sold to people in the US."
          : wallet?.kind === "mwa"
            ? "Your wallet asks you to approve every trade."
            : wallet
              ? "You're only tracking this wallet. Connect yours to ape."
              : "Free sniff. Connect a wallet to ape.";

  function toggleWatch() {
    tap();
    store.toggleWatch(coin);
    toast(watched ? `Stopped watching $${coin.symbol}.` : `Watching $${coin.symbol}. Find it in Alerts.`);
  }

  async function trade() {
    if (buying && (sniff.status === "error" || done?.level === "unknown")) {
      void sniffNow();
      return;
    }
    if (!wallet) {
      navigation.navigate("Connect");
      return;
    }
    if (wallet.kind !== "mwa") {
      toast("You're only tracking this wallet. Connect your own wallet to trade.");
      return;
    }
    setBusy(true);
    try {
      const order = await placeOrder(
        buying
          ? { mint: coin.mint, side, taker: wallet.address, amountUsdc: amount }
          : { mint: coin.mint, side, taker: wallet.address, amountRaw: shareOf(position?.raw ?? "0", sellPct) },
      );
      if (!order.ok) {
        toast(errorLine(order.error));
        return;
      }
      const signed = await signTransaction(order.value.transaction, wallet.authToken);
      if (signed.authToken !== wallet.authToken) store.setWallet({ ...wallet, authToken: signed.authToken });
      const landed = await executeOrder(order.value.requestId, signed.signed);
      if (!landed.ok || landed.value.status !== "Success") {
        toast(landed.ok ? "Didn't go through. Try again." : errorLine(landed.error));
        return;
      }
      forgetHoldings(wallet.address);
      void bag.refresh();
      const text = buying
        ? `Aped $${amount} of $${coin.symbol}${tp ? " · sells half at 2x" : ""}`
        : `Sold ${sellPct === 100 ? "all" : `${sellPct}%`} of $${coin.symbol}`;
      store.addActivity({ kind: buying ? "ape" : "sell", mint: coin.mint, symbol: coin.symbol, text, signature: landed.value.signature });
      if (buying && tp && !watched) store.toggleWatch(coin);
      toast(`${text}.`);
    } catch (e) {
      toast(walletError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: 230 + insets.bottom }]} keyboardShouldPersistTaps="handled">
        <View style={styles.top}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <Text style={styles.back}>←</Text>
          </Pressable>
          <Text style={styles.source} numberOfLines={1}>
            {source && share ? sourceLine(source, share) : ""}
          </Text>
          <Pressable onPress={toggleWatch} hitSlop={10} accessibilityRole="button" accessibilityLabel={watched ? "Stop watching" : "Watch this coin"}>
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
              {coin.kind === "stock" ? `${coin.name} · stock coin` : coin.name}
            </Text>
          </View>
          <View style={styles.priceCol}>
            <Text style={styles.price}>{price(coin.priceUsd)}</Text>
            <Text style={[styles.change, { color: up ? color.green : color.red }]}>{pct(coin.change24hPct)}</Text>
          </View>
        </View>

        <Text style={styles.stats}>
          {usd(coin.mcapUsd)} mcap · {count(coin.holders)} holders
        </Text>
        {coin.restrictions.includes("us-persons") && <Text style={styles.restricted}>Not sold to people in the US.</Text>}
        {others.length > 0 && (
          <Pressable
            onPress={() =>
              navigation.navigate("Choose", {
                title: "Not this one?",
                line: `Other coins in there${source && share ? `, ${sourceLine(source, share)}` : ""}.`,
                candidates: others,
                source,
                share,
                current: candidate,
              })
            }
            hitSlop={8}
            accessibilityRole="button"
          >
            <Text style={styles.notThis}>Not this one? See {others.length === 1 ? "the other coin" : `${others.length} others`}</Text>
          </Pressable>
        )}

        {position && (
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
        )}

        <View style={styles.report}>
          <SniffReport state={sniff} onRetry={() => void sniffNow()} />
        </View>

        {buying && canPickAmount && (
          <View style={styles.tp}>
            <View style={styles.tpText}>
              <Text style={styles.tpTitle}>Sell half at 2x</Text>
              <Text style={styles.tpNote}>Your ${amount} back when it doubles. The rest rides.</Text>
            </View>
            <Toggle value={tp} onChange={setTp} label="Sell half at 2x" />
          </View>
        )}
      </ScrollView>

      <View style={[styles.bar, { paddingBottom: 12 + insets.bottom }]}>
        {!buying && position && (
          <Text style={styles.held}>
            You have {fmtAmount(position.amount)} {coin.symbol} · {usd(position.usd)}
          </Text>
        )}
        {canPickAmount && (
          <View style={styles.chips}>
            {buying
              ? chips.map((c) => <Pill key={c} label={`$${c}`} on={c === amount} onPress={() => setAmount(c)} />)
              : SELL_SHARES.map((p) => <Pill key={p} label={p === 100 ? "All" : `${p}%`} on={p === sellPct} onPress={() => setSellPct(p)} />)}
          </View>
        )}
        <Button label={action.label} kind={action.tone} disabled={!action.enabled} onPress={() => void trade()} />
        <Text style={styles.barNote}>{note}</Text>
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
  side: {
    flexDirection: "row",
    alignSelf: "flex-start",
    marginTop: 20,
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
  report: { marginTop: 24, marginBottom: 12 },
  tp: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    padding: 16,
    borderRadius: 18,
    backgroundColor: color.ink2,
    borderWidth: 1,
    borderColor: color.line,
  },
  tpText: { flex: 1 },
  tpTitle: { fontFamily: font.bodyBold, fontSize: 17, color: color.white },
  tpNote: { marginTop: 2, fontFamily: font.body, fontSize: 14, lineHeight: 19, color: color.faint },
  bar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(11, 11, 12, 0.97)",
    borderTopWidth: 1,
    borderColor: color.line,
  },
  held: { marginBottom: 10, textAlign: "center", fontFamily: font.bodySemi, fontSize: 14.5, color: color.dim },
  chips: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 12 },
  barNote: { marginTop: 8, textAlign: "center", fontFamily: font.body, fontSize: 13.5, color: color.faint },
});
