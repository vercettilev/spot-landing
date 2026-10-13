import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import { fetchHoldings } from "../api";
import { onCelebrate } from "../components/Moment";
import { Button, Field, Section, Sheet, useRouteSheet, useToast } from "../components/ui";
import { primeHoldings } from "../holdings";
import type { RootParams } from "../navigation";
import { useStore } from "../store";
import { color, font, leading, space, type } from "../theme";
import { isAddressLike } from "../wallet/base58";
import { MWA_AVAILABLE, connectWallet, walletError } from "../wallet/mwa";
import { CashPanel } from "./DepositScreen";

type Props = NativeStackScreenProps<RootParams, "Connect">;

/**
 * CONNECTING, as a sheet over whatever asked for it. On Android the wallet
 * already on the phone answers through Mobile Wallet Adapter: it shows
 * Spot's name and usespot.fun, the user approves there, and Spot gets the
 * public address and a token to ask again later. Connecting to ape (from a
 * coin), the bag is read at once: short of USDC, the same sheet becomes
 * Add cash, so the next thing on screen is the next thing to do. From the
 * bag or Me, any address can be tracked instead: the bag shows, nothing
 * can trade.
 */
export function ConnectScreen({ navigation, route }: Props) {
  const store = useStore();
  const { ref, onDismiss } = useRouteSheet(navigation);
  const [toastNode, toast] = useToast(space.x6);
  const ape = route.params?.ape ?? null;
  const track = route.params?.track ?? false;
  const [step, setStep] = useState<"connect" | "counting" | "cash">("connect");
  const [busy, setBusy] = useState(false);
  const [cashBusy, setCashBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const address = input.trim();
  const valid = isAddressLike(address);

  /* The cash landed: back to the coin, its key ready. */
  useEffect(
    () =>
      onCelebrate((m) => {
        if (m.kind === "cash") ref.current?.close();
      }),
    [ref],
  );

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const c = await connectWallet();
      store.setWallet({ kind: "mwa", address: c.address, label: c.label, authToken: c.authToken, walletUriBase: c.walletUriBase });
      if (ape !== null) {
        setStep("counting");
        const bag = await fetchHoldings(c.address);
        if (bag.ok) primeHoldings(c.address, bag.value);
        if (bag.ok && bag.value.usdc.usd < ape) {
          setStep("cash");
          return;
        }
      }
      ref.current?.close();
    } catch (e) {
      setStep("connect");
      setError(walletError(e));
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
        title={step === "cash" && ape !== null ? `Add cash to ape $${ape}` : "Connect your wallet"}
        label={step === "cash" ? "Add cash" : "Connect your wallet"}
      >
        {step === "cash" ? (
          <CashPanel need={ape} toast={toast} onBusy={setCashBusy} />
        ) : (
          <>
            <Text style={styles.lede}>Spot builds each trade. Your wallet approves it, and your keys never leave it.</Text>
            {MWA_AVAILABLE ? (
              <>
                <Button
                  label={step === "counting" ? "Counting your cash…" : busy ? "Waiting for your wallet…" : "Connect wallet"}
                  kind={busy ? "wait" : "go"}
                  disabled={busy}
                  onPress={() => void connect()}
                  style={styles.cta}
                />
                <Text style={styles.note}>Seed Vault, Phantom, Solflare or Backpack. Your wallet asks to connect usespot.fun.</Text>
              </>
            ) : (
              <Text style={styles.soon}>{Platform.OS === "ios" ? "On iPhone you can only track a wallet for now." : "Wallets connect in the Android app."}</Text>
            )}
            {error ? (
              <Text style={styles.error} accessibilityLiveRegion="polite">
                {error}
              </Text>
            ) : null}

            {track || !MWA_AVAILABLE ? (
              <>
                <Section>Or just track a wallet</Section>
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
  note: { marginTop: space.x3, textAlign: "center", fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
  soon: { marginTop: space.x5, fontFamily: font.bodySemi, fontSize: type.caption, lineHeight: leading.caption, color: color.dim },
  error: { marginTop: space.x3, fontFamily: font.bodySemi, fontSize: type.caption, lineHeight: leading.caption, color: color.red },
  line: { fontFamily: font.body, fontSize: type.callout, lineHeight: leading.callout, color: color.dim },
  input: { marginTop: space.x3 },
  row: { flexDirection: "row", gap: space.x2, marginTop: space.x3 },
  half: { flex: 1 },
});
