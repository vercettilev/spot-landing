import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { ScrollView, Share, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";
import { ICON_SVG } from "../art";
import { Button, Card, TopBar, useToast } from "../components/ui";
import type { RootParams } from "../navigation";
import { useStore } from "../store";
import { color, font } from "../theme";

type Props = NativeStackScreenProps<RootParams, "Deposit">;

const NOTES = [
  "Only send on Solana. USDC or SOL sent on another network (Ethereum, Base, Tron) can be lost.",
  "From an exchange: withdraw USDC or SOL and choose Solana.",
];

/**
 * ADDING CASH. Spot buys with USDC, or with SOL when that is what the
 * wallet holds, and both go straight to the wallet's own address: Spot
 * never holds them. The code is the plain address, which every exchange
 * and wallet scanner reads.
 */
export function DepositScreen({ navigation }: Props) {
  const { wallet } = useStore();
  const [toastNode, toast] = useToast();

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

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <TopBar title="Add cash" onBack={() => navigation.goBack()} />
        <Text style={styles.h1}>Add cash.</Text>
        <Text style={styles.lede}>Load USDC (digital dollars) or SOL and ape anything you see. It goes to your own wallet, not to Spot.</Text>
        {wallet.kind === "watch" ? (
          <Card style={styles.watch}>
            <Text style={styles.watchText}>You're only tracking this wallet. Cash sent here lands in it, but you can't trade from it in Spot.</Text>
          </Card>
        ) : null}

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
