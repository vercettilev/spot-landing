import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { AppState, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { USDC_MINT, executeOrder, fetchHoldings, placeOrder } from "../api";
import { ICON_SVG } from "../art";
import { Button, Card, Group, Pill, Row, Section, Sheet, Steps, feel, useRouteSheet, useToast } from "../components/ui";
import { cashIn, onCashIn } from "../cashIn";
import { forgetHoldings, useHoldings } from "../holdings";
import { amount as fmtAmount, cashInLine, cashLede, coverWith, money, spareSol, turnKey, usd } from "../logic";
import type { RootParams } from "../navigation";
import { hold, pendingFor, subscribe } from "../pending";
import { useStore } from "../store";
import { color, font, leading, motion, radius, size, space, type } from "../theme";
import { LAND_WINDOW_MS, failedLine, orderErrorLine, secondsLeft, settled, snapshotOf, type Pending } from "../trade";
import type { TokenCard } from "../types";
import { signTransaction, walletError } from "../wallet/mwa";

type Props = NativeStackScreenProps<RootParams, "Deposit">;

/* A card buy happens in the wallet app: Seed Vault, Phantom, Solflare and
   Backpack each sell USDC through a card partner of their own. Spot has
   none yet, so it says the way that works. */
const BUY_STEPS = ["Open your wallet app and tap Buy.", "Pick USDC (digital dollars) on Solana and pay with your card.", "Come back to Spot. Your cash shows up here once it lands."];
const BUY_NOTE = "Your wallet app's card partner may ask for ID, and takes a fee.";
/* Spot's cash is USDC in the user's own wallet and Spot has no bank partner, so cashing out is said the way that works today: sent to an exchange, sold there. */
const OUT_STEPS = [
  "In your exchange (Coinbase, Kraken…), tap Deposit, pick USDC on Solana and copy the address it shows.",
  "In your wallet app, tap Send, pick USDC and paste that address.",
  "Back in the exchange, sell the USDC and withdraw to your bank.",
];
const OUT_NOTE = "Pick Solana in both apps. USDC sent on another network can be lost.";

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
 * ADDING CASH, as a sheet over whatever needed it. An ape is paid in
 * dollars (USDC), or in SOL when the dollars run short; dollars go straight
 * to the wallet's own address: Spot never holds them. A wallet that holds
 * SOL can turn some into cash here, in one approval, keeping 0.01 SOL back;
 * opened from a coin, the swap that covers the ape is picked already. When
 * the cash lands, the card says so where its key was and the sheet goes,
 * back to the coin with the key ready. From Home's Cash row it is the Cash sheet, with the
 * way out to a bank folded last. The code is the plain address, which every
 * exchange and wallet scanner reads.
 */
export function DepositScreen({ navigation, route }: Props) {
  const { ref, onDismiss } = useRouteSheet(navigation);
  const [toastNode, toast] = useToast(space.x6);
  const [busy, setBusy] = useState(false);
  const need = route.params?.need ?? null;
  /* Opened from Home's Cash row: all the money's ways, cashing out among them. */
  const all = route.params?.cash ?? false;
  useEffect(() => onCashIn(() => ref.current?.close()), [ref]);
  return (
    <View style={styles.fill}>
      <Sheet ref={ref} visible onDismiss={onDismiss} dismissable={!busy} title={need !== null ? `Add cash to ape $${need}` : all ? "Cash" : "Add cash"} label={all ? "Cash" : "Add cash"}>
        <CashPanel need={need} withdraw={all} toast={toast} onBusy={setBusy} onConnect={() => navigation.replace("Connect", need !== null ? { ape: need } : undefined)} />
      </Sheet>
      {toastNode}
    </View>
  );
}

/** What Add cash holds, in its own sheet or as the step after connecting from a coin. */
export function CashPanel({ need, withdraw = false, toast, onBusy, onConnect }: { need: number | null; withdraw?: boolean; toast: (m: string) => void; onBusy?: (busy: boolean) => void; onConnect?: () => void }) {
  const store = useStore();
  const { wallet } = store;
  const bag = useHoldings(wallet?.address ?? null);
  const [pick, setPick] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  /* The two ways in from outside, each folded to one line until asked for. */
  const [showBuy, setShowBuy] = useState(false);
  const [showAddress, setShowAddress] = useState(false);
  const [showOut, setShowOut] = useState(false);
  /* A swap that may still land locks the key, as a trade does on a coin. */
  const [pending, setPending] = useState<Pending | null>(() => (wallet ? pendingFor(wallet.address, USDC_MINT) : null));
  /* Cash that just landed, said where the key was. */
  const [landed, setLanded] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const owner = wallet?.address ?? null;

  useEffect(() => onBusy?.(busy), [busy, onBusy]);

  /* Back from buying in the wallet app, or from an exchange: the bag is read
     again, here and on every screen showing it. Not mid-swap, which reads its own. */
  useEffect(() => {
    if (!owner || busy) return;
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") forgetHoldings(owner);
    });
    return () => sub.remove();
  }, [owner, busy]);

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

  /* SOL that could be cash: all but the 0.01 SOL a trade keeps back. */
  const sol = bag.value?.sol ?? null;
  const spare = sol ? Math.floor(spareSol(sol)) : 0;
  const options = CASH_CHIPS.filter((c) => c <= spare);
  const all = spare >= 5 && !options.includes(spare) ? spare : null;
  /* For an ape, the swaps that cover it; "All" sits apart from them, where a slip of the finger can't spend it. */
  const choices = all === null ? options : need !== null && options.length ? options : [...options, all];
  const cashNow = bag.value?.usdc.usd ?? null;
  const chosen = pick !== null && choices.includes(pick) ? pick : coverWith(choices, need, cashNow);
  const canTurn = wallet.kind === "mwa" && spare >= 5 && chosen !== null;
  /* The wallet on this phone, which can buy and sign; a tracked one can only receive. */
  const mwa = wallet.kind === "mwa";
  const key = turnKey({ pending: pending ? { landed: pending.landed, seconds: secondsLeft(pending, now) } : null, busy, chosen });
  const lede = cashLede(cashNow, canTurn ? null : (sol?.usd ?? null));


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
          feel("success");
          /* The word where the key was, a moment, then the sheet goes, back to what needed the cash. */
          setLanded(chosen);
          setTimeout(() => cashIn(chosen), motion.cashIn);
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
      {/* The SOL is said once: on the card, when it can be turned into cash. */}
      {lede ? <Text style={styles.lede}>{lede}</Text> : null}
      {wallet.kind === "watch" ? (
        <Card style={styles.watch}>
          <Text style={styles.watchText}>You're only tracking this wallet. Cash sent here lands in it, but you can't trade from it in Spot.</Text>
        </Card>
      ) : null}

      {canTurn && sol && (
        <Card style={styles.turn}>
          <Text style={styles.turnTitle}>Turn SOL into cash</Text>
          <Text style={styles.turnNote}>
            {fmtAmount(sol.amount)} SOL, about {usd(sol.usd)}.
          </Text>
          <View style={styles.turnChips}>
            {choices.map((c) => (
              <Pill key={c} label={c === all ? `All ($${c})` : `$${c}`} on={c === chosen} onPress={() => setPick(c)} disabled={Boolean(pending) || busy} />
            ))}
          </View>
          {landed !== null ? (
            <Text style={styles.cashIn} accessibilityLiveRegion="polite">
              {cashInLine(landed)}
            </Text>
          ) : (
            <Button label={key.label} kind={pending ? "wait" : "go"} disabled={!key.enabled} onPress={() => void turn()} style={styles.turnButton} />
          )}
        </Card>
      )}

      {/* Your own wallet: a card, through its app's Buy, or the address. A tracked one only has the address. */}
      {mwa ? (
        <>
          <Group style={styles.more}>
            <Row
              title="Buy with a card"
              subtitle={showBuy ? "Three steps, below" : "In your wallet app"}
              chevron
              onPress={() => setShowBuy((v) => !v)}
              label={showBuy ? "Hide how to buy with a card" : "Show how to buy with a card in your wallet app"}
            />
          </Group>
          {showBuy ? <Steps steps={BUY_STEPS} note={BUY_NOTE} style={styles.steps} /> : null}
          <Group style={styles.more}>
            <Row
              title="Send from an exchange or wallet"
              subtitle={showAddress ? "Your wallet's address, below" : "Your wallet's address"}
              chevron
              onPress={() => setShowAddress((v) => !v)}
              label={showAddress ? "Hide your wallet's address" : "Show your wallet's address, to send from an exchange or another wallet"}
            />
          </Group>
        </>
      ) : (
        <Section>Your wallet's address</Section>
      )}
      {!mwa || showAddress ? (
        <>
          <View style={[styles.paper, mwa && styles.paperFirst]}>
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
      ) : null}

      {/* Opened from Home's Cash row: the way out sits last, folded like the ways in. */}
      {mwa && withdraw ? (
        <>
          <Group style={styles.more}>
            <Row
              title="Cash out to your bank"
              subtitle={showOut ? "Three steps, below" : "Through an exchange"}
              chevron
              onPress={() => setShowOut((v) => !v)}
              label={showOut ? "Hide how to cash out" : "Show how to cash out to your bank through an exchange"}
            />
          </Group>
          {showOut ? <Steps steps={OUT_STEPS} note={OUT_NOTE} caution style={styles.steps} /> : null}
        </>
      ) : null}
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
  turn: { marginTop: space.x2, backgroundColor: color.ink3 },
  turnTitle: { fontFamily: font.displayBold, fontSize: type.key, color: color.white },
  turnNote: { marginTop: space.x2, fontFamily: font.body, fontSize: type.caption, lineHeight: leading.caption, color: color.dim },
  turnChips: { flexDirection: "row", flexWrap: "wrap", gap: space.x2, marginTop: space.x4 },
  turnButton: { marginTop: space.x4 },
  cashIn: { marginTop: space.x4, minHeight: size.key + size.keyEdge, textAlign: "center", textAlignVertical: "center", lineHeight: size.key + size.keyEdge, fontFamily: font.display, fontSize: type.lead, color: color.orange },
  paper: { alignItems: "center", paddingTop: space.x6, paddingBottom: space.x5, paddingHorizontal: space.x5, borderRadius: radius.block, backgroundColor: color.white },
  paperFirst: { marginTop: space.x4 },
  more: { marginTop: space.x3 },
  steps: { marginTop: space.x4, marginHorizontal: space.x1 },
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
