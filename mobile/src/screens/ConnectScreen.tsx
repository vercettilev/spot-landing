import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Button, Card, PuppyIcon, Section, TopBar } from "../components/ui";
import type { RootParams } from "../navigation";
import { useStore } from "../store";
import { color, font } from "../theme";
import { isAddressLike } from "../wallet/base58";
import { MWA_AVAILABLE, connectWallet, walletError } from "../wallet/mwa";

type Props = NativeStackScreenProps<RootParams, "Connect">;

/**
 * CONNECTING. On Android the wallet already on the phone answers through
 * Mobile Wallet Adapter: it shows Spot's name, the user approves there, and
 * Spot gets the public address and a token to ask again later. Anywhere,
 * any address can be watched instead: the bag shows, nothing can trade.
 */
export function ConnectScreen({ navigation }: Props) {
  const store = useStore();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const address = input.trim();
  const valid = isAddressLike(address);

  async function connect() {
    setBusy(true);
    setError(null);
    try {
      const c = await connectWallet();
      store.setWallet({ kind: "mwa", address: c.address, label: c.label, authToken: c.authToken, walletUriBase: c.walletUriBase });
      navigation.goBack();
    } catch (e) {
      setError(walletError(e));
    } finally {
      setBusy(false);
    }
  }

  function watch(a: string) {
    store.setWallet({ kind: "watch", address: a, label: null });
    navigation.goBack();
  }

  async function paste() {
    const text = (await Clipboard.getStringAsync().catch(() => "")).trim();
    if (!text) return;
    setInput(text);
    if (isAddressLike(text)) watch(text);
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TopBar title="Wallet" onBack={() => navigation.goBack()} />
        <Text style={styles.h1}>Connect a wallet.</Text>
        <Text style={styles.lede}>Your coins stay in your wallet. Spot asks it to sign each trade, in its own screen, and never sees a key.</Text>

        <Card style={styles.card}>
          <View style={styles.cardHead}>
            <PuppyIcon size={40} />
            <View style={styles.cardText}>
              <Text style={styles.cardTitle}>The wallet on this phone</Text>
              <Text style={styles.cardNote}>Seed Vault on a Seeker, Phantom, Solflare, Backpack.</Text>
            </View>
          </View>
          {MWA_AVAILABLE ? (
            <Button label={busy ? "Waiting for the wallet…" : "Connect"} kind={busy ? "wait" : "go"} disabled={busy} onPress={() => void connect()} style={styles.cardButton} />
          ) : (
            <Text style={styles.soon}>{Platform.OS === "ios" ? "On iPhone, Spot watches an address for now." : "Wallets connect in the Android app."}</Text>
          )}
          {error ? <Text style={styles.error}>{error}</Text> : null}
        </Card>

        <Section>Or watch an address</Section>
        <Text style={styles.line}>See any wallet's bag without connecting it. Watching can't trade.</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="A Solana address"
          placeholderTextColor="#8e8a82"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="done"
          onSubmitEditing={() => valid && watch(address)}
          style={styles.input}
          accessibilityLabel="Solana address to watch"
        />
        {address && !valid ? <Text style={styles.error}>That isn't a Solana address.</Text> : null}
        <View style={styles.row}>
          <Button label="Paste" kind="quiet" onPress={() => void paste()} style={styles.half} />
          <Button label="Watch it" disabled={!valid} onPress={() => watch(address)} style={styles.half} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: color.ink },
  scroll: { paddingHorizontal: 20, paddingBottom: 48 },
  h1: { marginTop: 10, fontFamily: font.display, fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: color.white },
  lede: { marginTop: 10, fontFamily: font.body, fontSize: 16.5, lineHeight: 23, color: color.dim },
  card: { marginTop: 22 },
  cardHead: { flexDirection: "row", alignItems: "center", gap: 14 },
  cardText: { flex: 1 },
  cardTitle: { fontFamily: font.bodyBold, fontSize: 17, color: color.white },
  cardNote: { marginTop: 3, fontFamily: font.body, fontSize: 14, lineHeight: 19, color: color.faint },
  cardButton: { marginTop: 18 },
  soon: { marginTop: 16, fontFamily: font.bodySemi, fontSize: 14.5, lineHeight: 20, color: color.dim },
  error: { marginTop: 12, fontFamily: font.bodySemi, fontSize: 14, lineHeight: 19, color: color.red },
  line: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.dim },
  input: {
    marginTop: 12,
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: color.white,
    fontFamily: font.mono,
    fontSize: 15,
    color: color.ink,
  },
  row: { flexDirection: "row", gap: 10, marginTop: 12 },
  half: { flex: 1 },
});
