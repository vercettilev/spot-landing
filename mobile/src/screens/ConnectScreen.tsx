import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Linking, Platform, StyleSheet, Text, View } from "react-native";
import { apeAfterConnect } from "../afterConnect";
import { fetchHoldings } from "../api";
import { onCashIn } from "../cashIn";
import { Button, Field, Section, Sheet, useRouteSheet, useToast } from "../components/ui";
import { primeHoldings } from "../holdings";
import { SOL_MINT, payFor, spareSol } from "../logic";
import type { RootParams } from "../navigation";
import { useStore } from "../store";
import { color, font, leading, motion, space, type } from "../theme";
import { isAddressLike } from "../wallet/base58";
import { MWA_AVAILABLE, connectWallet, walletError } from "../wallet/mwa";
import { CashPanel } from "./DepositScreen";

type Props = NativeStackScreenProps<RootParams, "Connect">;

/* Where a phone without a wallet gets one: Phantom's own listing on Google Play. */
const GET_PHANTOM = "https://play.google.com/store/apps/details?id=app.phantom";

/**
 * CONNECTING, as a sheet over whatever asked for it. On Android the wallet
 * already on the phone answers through Mobile Wallet Adapter: it shows
 * Spot's name and usespot.fun, the user approves there, and Spot gets the
 * public address and a token to ask again later. Connecting to ape (from a
 * coin), the bag is read at once: short of USDC, the same sheet becomes
 * Add cash, so the next thing on screen is the next thing to do. Opened
 * from Settings' Track a wallet, it takes any address instead: the bag
 * shows, nothing can trade. One sheet, one job.
 */
export function ConnectScreen({ navigation, route }: Props) {
  const store = useStore();
  const { ref, onDismiss } = useRouteSheet(navigation);
  const [toastNode, toast] = useToast(space.x6);
  const ape = route.params?.ape ?? null;
  const mint = route.params?.mint ?? null;
  const track = route.params?.track ?? false;
  const [step, setStep] = useState<"connect" | "counting" | "cash">("connect");
  const [busy, setBusy] = useState(false);
  const [cashBusy, setCashBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /* No wallet app on the phone: not an error to show in red, a thing to get. */
  const [missing, setMissing] = useState(false);
  const [input, setInput] = useState("");
  /* Tracking an address is its own errand, from Settings; here it is only the road where no wallet adapter is. */
  const tracking = track || !MWA_AVAILABLE;
  const address = input.trim();
  const valid = isAddressLike(address);

  /* The cash landed: back to the coin, its key ready. */
  useEffect(() => onCashIn(() => ref.current?.close()), [ref]);

  /* Opened by a tap on Ape, the wallet is asked at once: that tap was the ask. */
  useEffect(() => {
    if (ape === null || track || !MWA_AVAILABLE) return;
    const timer = setTimeout(() => void connect(), motion.sheetUp);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connect() {
    setBusy(true);
    setError(null);
    setMissing(false);
    try {
      const c = await connectWallet();
      store.setWallet({ kind: "mwa", address: c.address, label: c.label, authToken: c.authToken, walletUriBase: c.walletUriBase });
      if (ape !== null) {
        setStep("counting");
        const bag = await fetchHoldings(c.address);
        if (bag.ok) primeHoldings(c.address, bag.value);
        /* Short of both USDC and SOL for the ape, the next thing is cash; otherwise the ape goes on under the sheet. */
        const pays = bag.ok ? payFor({ amount: ape, cash: bag.value.usdc.usd, sol: mint === SOL_MINT ? 0 : spareSol(bag.value.sol) }) : null;
        if (bag.ok && pays === null) {
          setStep("cash");
          return;
        }
        if (pays !== null && mint) apeAfterConnect({ mint, amount: ape });
      }
      ref.current?.close();
    } catch (e) {
      setStep("connect");
      if ((e as { code?: string })?.code === "ERROR_WALLET_NOT_FOUND") setMissing(true);
      else setError(walletError(e));
    } finally {
      setBusy(false);
    }
  }

  function watch(a: string) {
    store.setWallet({ kind: "watch", address: a, label: null });
    ref.current?.close();
  }

  async function paste() {
    const text = (await Clipboard.getStringAsync().catch(() => "")).trim();
    if (!text) return;
    setInput(text);
    if (isAddressLike(text)) watch(text);
  }

  return (
    <View style={styles.fill}>
      <Sheet
        ref={ref}
        visible
        onDismiss={onDismiss}
        dismissable={!busy && !cashBusy}
        title={step === "cash" && ape !== null ? `Add cash to ape $${ape}` : track ? "Track a wallet" : "Connect your wallet"}
        label={step === "cash" ? "Add cash" : track ? "Track a wallet" : "Connect your wallet"}
      >
        {step === "cash" ? (
          <CashPanel need={ape} toast={toast} onBusy={setCashBusy} />
        ) : (
          <>
            {track ? null : (
              <Text style={styles.lede}>Your wallet app (Phantom, Solflare, Backpack or Seed Vault) keeps your money and approves every trade.</Text>
            )}
            {track ? null : MWA_AVAILABLE && missing ? (
              <>
                <Text style={styles.missing} accessibilityLiveRegion="polite">
                  There's no wallet app on this phone yet. Phantom is free and takes a minute to set up; then come back and connect.
                </Text>
                <Button label="Get Phantom (free)" onPress={() => void Linking.openURL(GET_PHANTOM).catch(() => {})} style={styles.cta} />
                <Button label="I have one now. Connect" kind="quiet" disabled={busy} onPress={() => void connect()} style={styles.again} />
              </>
            ) : MWA_AVAILABLE ? (
              <Button
                label={step === "counting" ? "Counting your cash…" : busy ? "Waiting for your wallet…" : "Connect wallet"}
                kind={busy ? "wait" : "go"}
                disabled={busy}
                onPress={() => void connect()}
                style={styles.cta}
              />
            ) : (
              <Text style={styles.soon}>{Platform.OS === "ios" ? "On iPhone you can only track a wallet for now." : "Wallets connect in the Android app."}</Text>
            )}
            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            {tracking ? (
              <>
                {track ? null : <Section>Track a wallet</Section>}
                <Text style={styles.line}>See any wallet's bag. You can't trade from it.</Text>
                <Field
                  mono
                  value={input}
                  onChangeText={setInput}
                  placeholder="Wallet address"
                  returnKeyType="done"
                  onSubmitEditing={() => valid && watch(address)}
                  style={styles.input}
                  accessibilityLabel="Wallet address to track"
                />
                {address && !valid ? <Text style={styles.error}>That's not a Solana wallet address.</Text> : null}
                <View style={styles.row}>
                  <Button label="Paste" kind="quiet" onPress={() => void paste()} style={styles.half} />
                  <Button label="Track it" disabled={!valid} onPress={() => watch(address)} style={styles.half} />
                </View>
              </>
            ) : null}
          </>
        )}
      </Sheet>
      {toastNode}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  lede: { fontFamily: font.body, fontSize: type.body, lineHeight: leading.body, color: color.dim },
  cta: { marginTop: space.x6 },
  again: { marginTop: space.x3 },
  missing: { marginTop: space.x5, fontFamily: font.bodySemi, fontSize: type.body, lineHeight: leading.body, color: color.white },
  soon: { marginTop: space.x5, fontFamily: font.bodySemi, fontSize: type.caption, lineHeight: leading.caption, color: color.dim },
  error: { marginTop: space.x3, fontFamily: font.bodySemi, fontSize: type.caption, lineHeight: leading.caption, color: color.red },
  line: { fontFamily: font.body, fontSize: type.callout, lineHeight: leading.callout, color: color.dim },
  input: { marginTop: space.x3 },
  row: { flexDirection: "row", gap: space.x2, marginTop: space.x3 },
  half: { flex: 1 },
});
