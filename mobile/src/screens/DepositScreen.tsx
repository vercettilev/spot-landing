import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { USDC_MINT, executeOrder, fetchHoldings, placeOrder } from "../api";
import { ICON_SVG } from "../art";
import { celebrate, onCelebrate } from "../components/Moment";
import { Button, Card, Pill, Section, Sheet, feel, useRouteSheet, useToast } from "../components/ui";
import { forgetHoldings, useHoldings } from "../holdings";
import { amount as fmtAmount, cashLede, coverWith, money, turnKey, usd } from "../logic";
import type { RootParams } from "../navigation";
import { hold, pendingFor, subscribe } from "../pending";
import { useStore } from "../store";
import { color, font, leading, radius, space, type } from "../theme";
import { LAND_WINDOW_MS, failedLine, orderErrorLine, secondsLeft, settled, snapshotOf, type Pending } from "../trade";
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
 * ADDING CASH, as a sheet over whatever needed it. Spot apes in dollars
 * (USDC), and dollars go straight to the wallet's own address: Spot never
 * holds them. A wallet that holds SOL turns some into cash here, in one
 * approval, keeping a little for fees; opened from a coin, the swap that
 * covers the ape is picked already. When the cash lands, the moment says
 * so and the sheet goes, back to the coin with the key ready. The code is
 * the plain address, which every exchange and wallet scanner reads.
 */
export function DepositScreen({ navigation, route }: Props) {
  const { ref, onDismiss } = useRouteSheet(navigation);
  const [toastNode, toast] = useToast(space.x6);
  const [busy, setBusy] = useState(false);
  const need = route.params?.need ?? null;
  useEffect(
    () =>
      onCelebrate((m) => {
        if (m.kind === "cash") ref.current?.close();
      }),
    [ref],
  );
  return (
    <View style={styles.fill}>
      <Sheet ref={ref} visible onDismiss={onDismiss} dismissable={!busy} title={need !== null ? `Add cash to ape $${need}` : "Add cash"} label="Add cash">
        <CashPanel need={need} toast={toast} onBusy={setBusy} onConnect={() => navigation.replace("Connect", need !== null ? { ape: need } : undefined)} />
      </Sheet>
      {toastNode}
    </View>
  );
}

/** What Add cash holds, in its own sheet or as the step after connecting from a coin. */
export function CashPanel({ need, toast, onBusy, onConnect }: { need: number | null; toast: (m: string) => void; onBusy?: (busy: boolean) => void; onConnect?: () => void }) {
  const store = useStore();
  const { wallet } = store;
  const bag = useHoldings(wallet?.address ?? null);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  /* A swap that may still land locks the key, as a trade does on a coin. */
  const [pending, setPending] = useState<Pending | null>(() => (wallet ? pendingFor(wallet.address, USDC_MINT) : null));
  const [now, setNow] = useState(() => Date.now());
  const owner = wallet?.address ?? null;

  useEffect(() => onBusy?.(busy), [busy, onBusy]);

  useEffect(() => {
    if (!owner) return;
    setPending(pendingFor(owner, USDC_MINT));
    return subscribe((p, fate) => {
      if (p.owner === owner && p.mint === USDC_MINT) setPending(fate ? null : p);
    });
  }, [owner]);

  useEffect(() => {
    if (!pending) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [pending]);

  if (!wallet) {
    return (
      <>
        <Text style={styles.lede}>Cash goes to your own wallet, so connect it first.</Text>
        <Button label="Connect wallet" onPress={onConnect} style={styles.cta} />
      </>
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
  const cashNow = bag.value?.usdc.usd ?? null;
  const chosen = pick !== null && choices.includes(pick) ? pick : coverWith(choices, need, cashNow);
  const canTurn = wallet.kind === "mwa" && spare >= 5 && chosen !== null;
  const key = turnKey({ pending: pending ? { landed: pending.landed, seconds: secondsLeft(pending, now) } : null, busy, chosen });


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
    <>
      <Text style={styles.lede}>{cashLede(need, cashNow)}</Text>
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
              <Pill key={c} label={c === all ? `All ($${c})` : `$${c}`} on={c === chosen} onPress={() => setPick(c)} disabled={Boolean(pending) || busy} />
            ))}
          </View>
          <Button label={key.label} kind={pending ? "wait" : "go"} disabled={!key.enabled} onPress={() => void turn()} style={styles.turnButton} />
        </Card>
      )}

      {canTurn ? <Section>Or send it to your wallet</Section> : null}
      <View style={[styles.paper, !canTurn && styles.paperFirst]}>
        <QRCode value={address} size={QR} color={color.ink} backgroundColor={color.white} ecl="H" logoSVG={ICON_SVG} logoSize={QR / 5} logoMargin={space.x1 + space.hair} logoBackgroundColor={color.white} />
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
    </>
  );
}

/* The code's size, and the Share key beside Copy address. */
const QR = 216;
const SHARE = 112;

const styles = StyleSheet.create({
  fill: { flex: 1 },
  lede: { fontFamily: font.body, fontSize: type.body, lineHeight: leading.body, color: color.dim },
  cta: { marginTop: space.x6 },
  watch: { marginTop: space.x4, borderColor: color.orangeLine },
  watchText: { fontFamily: font.body, fontSize: type.caption, lineHeight: leading.caption, color: color.dim },
  turn: { marginTop: space.x5, backgroundColor: color.ink3 },
  turnTitle: { fontFamily: font.displayBold, fontSize: type.key, color: color.white },
  turnNote: { marginTop: space.x2, fontFamily: font.body, fontSize: type.caption, lineHeight: leading.caption, color: color.dim },
  turnChips: { flexDirection: "row", flexWrap: "wrap", gap: space.x2, marginTop: space.x4 },
  turnButton: { marginTop: space.x4 },
  paper: { alignItems: "center", paddingTop: space.x6, paddingBottom: space.x5, paddingHorizontal: space.x5, borderRadius: radius.block, backgroundColor: color.white },
  paperFirst: { marginTop: space.x5 },
  address: { marginTop: space.x5, textAlign: "center", fontFamily: font.mono, fontSize: type.body, lineHeight: leading.body, color: color.paperInk },
  network: { marginTop: space.x2, fontFamily: font.bodyBold, fontSize: type.footnote, color: color.paperDim },
  actions: { flexDirection: "row", gap: space.x2, marginTop: space.x5 },
  action: { flex: 1 },
  share: { width: SHARE },
  notes: { marginTop: space.x5, gap: space.x3 },
  note: { flexDirection: "row", gap: space.x3 },
  dot: { fontFamily: font.bodyBold, fontSize: type.callout, lineHeight: leading.callout, color: color.orange },
  noteText: { flex: 1, fontFamily: font.body, fontSize: type.caption, lineHeight: leading.callout, color: color.dim },
});
