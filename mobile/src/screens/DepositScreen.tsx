import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { USDC_MINT, executeOrder, fetchHoldings, placeOrder } from "../api";
import { ICON_SVG } from "../art";
import { celebrate } from "../components/Moment";
import { Button, Card, Pill, TopBar, feel, useToast } from "../components/ui";
import { forgetHoldings, useHoldings } from "../holdings";
import { amount as fmtAmount, money, usd } from "../logic";
import type { RootParams } from "../navigation";
import { hold } from "../pending";
import { useStore } from "../store";
import { color, font } from "../theme";
import { LAND_WINDOW_MS, failedLine, orderErrorLine, settled, snapshotOf } from "../trade";
import type { TokenCard } from "../types";
import { signTransaction, walletError } from "../wallet/mwa";

type Props = NativeStackScreenProps<RootParams, "Deposit">;

const NOTES = [
  "Only send on Solana. USDC or SOL sent on another network (Ethereum, Base, Tron) can be lost.",
  "From an exchange: withdraw USDC or SOL and choose Solana.",
];

/* Dollars, for the hold that waits on a SOL-to-cash swap. */
const USDC: TokenCard = {
  mint: USDC_MINT,
  symbol: "USDC",
  name: "USD Coin",
  icon: null,
  decimals: 6,
  kind: "coin",
  priceUsd: 1,
  mcapUsd: null,
  liquidityUsd: null,
  holders: null,
  change24hPct: null,
  verified: true,
  issuer: null,
  restrictions: [],
};

const CASH_CHIPS = [25, 50, 100];

/**
 * ADDING CASH. Spot apes in dollars (USDC), and dollars go straight to the
 * wallet's own address: Spot never holds them. A wallet that holds SOL
 * instead turns some into cash here, in one approval, and keeps a little
 * for fees. The code is the plain address, which every exchange and wallet
 * scanner reads.
 */
export function DepositScreen({ navigation }: Props) {
  const store = useStore();
  const { wallet } = store;
  const bag = useHoldings(wallet?.address ?? null);
  const [toastNode, toast] = useToast();
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  if (!wallet) {
    return (
      <View style={styles.fill}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <TopBar title="Add cash" onBack={() => navigation.goBack()} />
          <Text style={styles.h1}>Connect first.</Text>
          <Text style={styles.lede}>Cash goes to your own wallet, so connect it first.</Text>
          <Button label="Connect wallet" onPress={() => navigation.replace("Connect")} style={styles.cta} />
        </ScrollView>
      </View>
    );
  }

  const address = wallet.address;
  async function copy() {
    await Clipboard.setStringAsync(address).catch(() => {});
    toast("Address copied. Paste it where you send from.");
  }

  /* SOL that could be cash: all but a dollar's worth, for fees. */
  const sol = bag.value?.sol ?? null;
  const spare = sol?.usd !== null && sol?.usd !== undefined ? Math.floor(sol.usd - 1) : 0;
  const options = CASH_CHIPS.filter((c) => c <= spare);
  const all = spare >= 5 && !options.includes(spare) ? spare : null;
  const choices = all === null ? options : [...options, all];
  const chosen = pick !== null && choices.includes(pick) ? pick : (choices[0] ?? null);
  const canTurn = wallet.kind === "mwa" && spare >= 5 && chosen !== null;

  async function turn() {
    if (!canTurn || busy || wallet === null || wallet.kind !== "mwa" || chosen === null) return;
    setBusy(true);
    try {
      const [order, fresh] = await Promise.all([
        placeOrder({ mint: USDC_MINT, side: "buy", taker: wallet.address, amountUsdc: chosen, payWith: "sol" }),
        fetchHoldings(wallet.address),
      ]);
      if (!order.ok) {
        toast(order.error === "refused" ? "Not enough SOL for that. Keep a little for fees." : orderErrorLine(order.error, order.detail, "buy"));
        return;
      }
      const builtAt = Date.now();
      const before = snapshotOf(fresh.ok ? fresh.value : bag.value, USDC_MINT);
      const signed = await signTransaction(order.value.transaction, wallet.authToken, wallet.address);
      if (signed.authToken !== wallet.authToken) store.setWallet({ ...wallet, authToken: signed.authToken });
      const res = await executeOrder(order.value.requestId, signed.signed);
      const text = `Turned ${money(chosen)} of SOL into cash`;
      switch (settled(res)) {
        case "landed":
          forgetHoldings(wallet.address);
          celebrate({ kind: "cash", symbol: "USDC", usdc: chosen, amount: chosen });
          return;
        case "failed":
          feel("error");
          toast(failedLine(res, "buy"));
          return;
        default:
          hold({
            owner: wallet.address,
            mint: USDC_MINT,
            token: USDC,
            side: "buy",
            payWith: "sol",
            landed: false,
            before,
            until: builtAt + LAND_WINDOW_MS,
            text,
            signature: res.ok ? res.value.signature : null,
            quote: { usdc: chosen, amount: chosen },
          });
          toast("Still landing. Spot will tell you when it has.");
      }
    } catch (e) {
      toast(walletError(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TopBar title="Add cash" onBack={() => navigation.goBack()} />
        <Text style={styles.h1}>Add cash.</Text>
        <Text style={styles.lede}>Spot apes in dollars: USDC on Solana. It goes to your own wallet, not to Spot.</Text>
        {wallet.kind === "watch" ? (
          <Card style={styles.watch}>
            <Text style={styles.watchText}>You're only tracking this wallet. Cash sent here lands in it, but you can't trade from it in Spot.</Text>
          </Card>
        ) : null}

        {canTurn && sol && (
          <Card style={styles.turn}>
            <Text style={styles.turnTitle}>Got SOL? Turn it into cash.</Text>
            <Text style={styles.turnNote}>
              You have {fmtAmount(sol.amount)} SOL, about {usd(sol.usd)}. One approval, and a little SOL stays for fees.
            </Text>
            <View style={styles.turnChips}>
              {choices.map((c) => (
                <Pill key={c} label={c === all ? `All ($${c})` : `$${c}`} on={c === chosen} onPress={() => setPick(c)} />
              ))}
            </View>
            <Button label={busy ? "Turning…" : `Turn ${usd(chosen)} into cash`} disabled={busy} onPress={() => void turn()} style={styles.turnButton} />
          </Card>
        )}

        <View style={styles.paper}>
          <QRCode value={address} size={232} color={color.ink} backgroundColor={color.white} ecl="H" logoSVG={ICON_SVG} logoSize={46} logoMargin={6} logoBackgroundColor={color.white} />
          {/* Two even lines: a Solana address is too wide for one, and halves
              are easier to check against the wallet's own screen. */}
          <Text style={styles.address} selectable>
            {address.slice(0, Math.ceil(address.length / 2))}
            {"\n"}
            {address.slice(Math.ceil(address.length / 2))}
          </Text>
          <Text style={styles.network}>USDC or SOL, on Solana</Text>
        </View>

        <View style={styles.actions}>
          <Button label="Copy address" onPress={() => void copy()} style={styles.action} />
          <Button label="Share" kind="quiet" onPress={() => void Share.share({ message: address }).catch(() => {})} style={styles.share} />
        </View>

        <View style={styles.notes}>
          {NOTES.map((n) => (
            <View key={n} style={styles.note}>
              <Text style={styles.dot}>•</Text>
              <Text style={styles.noteText}>{n}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
      {toastNode}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.ink },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { marginTop: 10, fontFamily: font.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: color.white },
  lede: { marginTop: 10, fontFamily: font.body, fontSize: 16.5, lineHeight: 23, color: color.dim },
  cta: { marginTop: 24 },
  watch: { marginTop: 16, borderColor: "rgba(252, 78, 2, 0.45)" },
  watchText: { fontFamily: font.body, fontSize: 14.5, lineHeight: 20, color: color.dim },
  turn: { marginTop: 18 },
  turnTitle: { fontFamily: font.displayBold, fontSize: 19, color: color.white },
  turnNote: { marginTop: 6, fontFamily: font.body, fontSize: 14.5, lineHeight: 20, color: color.dim },
  turnChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  turnButton: { marginTop: 14 },
  paper: { alignItems: "center", marginTop: 22, paddingTop: 24, paddingBottom: 18, paddingHorizontal: 18, borderRadius: 24, backgroundColor: color.white },
  address: { marginTop: 18, textAlign: "center", fontFamily: font.mono, fontSize: 16, lineHeight: 23, letterSpacing: 0.3, color: color.paperInk },
  network: { marginTop: 8, fontFamily: font.bodyBold, fontSize: 13, letterSpacing: 0.4, color: color.paperDim },
  actions: { flexDirection: "row", gap: 10, marginTop: 18 },
  action: { flex: 1 },
  share: { width: 110 },
  notes: { marginTop: 18, gap: 10 },
  note: { flexDirection: "row", gap: 10 },
  dot: { fontFamily: font.bodyBold, fontSize: 15, lineHeight: 21, color: color.orange },
  noteText: { flex: 1, fontFamily: font.body, fontSize: 14.5, lineHeight: 21, color: color.dim },
});
