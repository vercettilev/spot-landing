import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Group, OutIcon, Pill, PuppyIcon, Row, Section, SettingRow, Title, Toggle, useToast } from "../components/ui";
import { useHoldings } from "../holdings";
import { CHIPS, money } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { useStore } from "../store";
import { color, font, space, type } from "../theme";
import { short } from "../wallet/base58";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Me">, NativeStackScreenProps<RootParams>>;

const LINKS = [
  { label: "Spot on X", note: "@usespotdotfun", url: "https://x.com/usespotdotfun" },
  { label: "usespot.fun", note: null, url: "https://www.usespot.fun" },
  { label: "Privacy", note: "What Spot keeps, and doesn't", url: "https://www.usespot.fun/privacy" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function month(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "today" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * ME: what Spot has done for you, first. The loud number is the scams it
 * kept out of your bag; then the wallet this phone trades from, and the few
 * choices every buy starts with. No account: it all lives on this phone.
 */
export function MeScreen({ navigation }: Props) {
  const store = useStore();
  const { wallet, settings, stats } = store;
  const bag = useHoldings(wallet?.address ?? null);
  const [toastNode, toast] = useToast();
  const version = Constants.expoConfig?.version ?? "0.1.0";
  const build = Constants.expoConfig?.android?.versionCode;

  async function copy(address: string) {
    await Clipboard.setStringAsync(address).catch(() => {});
    toast("Address copied.");
  }

  function disconnect() {
    store.setWallet(null);
    toast(wallet?.kind === "watch" ? "Stopped tracking." : "Disconnected. Your coins stay in your wallet.");
  }

  const total = bag.value ? money(bag.value.totalUsd) : "…";
  const proof =
    stats.sniffed === 0
      ? "Sniff your first coin and Spot starts counting."
      : `Out of ${stats.sniffed} coin${stats.sniffed === 1 ? "" : "s"} sniffed. ${stats.apes === 0 ? "None aped yet." : `${stats.apes} aped.`}`;

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Me</Title>

        <View style={styles.profile}>
          <PuppyIcon size={56} />
          <View style={styles.profileText}>
            <Text style={styles.since}>Degen since {month(settings.since)}</Text>
            <Text style={styles.who} numberOfLines={1}>
              {wallet ? `${wallet.kind === "watch" ? "Tracking" : (wallet.label ?? "Wallet")} ${short(wallet.address)}` : "No wallet yet"}
            </Text>
          </View>
        </View>

        <View style={styles.score} accessible accessibilityLabel={`${stats.dodged} scams dodged. ${proof}`}>
          <Text style={[styles.scoreN, stats.dodged > 0 && styles.scoreHot]}>{stats.dodged}</Text>
          <View style={styles.scoreText}>
            <Text style={styles.scoreLabel}>{stats.dodged === 1 ? "scam dodged" : "scams dodged"}</Text>
            <Text style={styles.scoreProof}>{proof}</Text>
          </View>
        </View>

        <Section>Wallet</Section>
        {wallet ? (
          <Group>
            <Row
              title={wallet.kind === "watch" ? "Tracking a wallet" : (wallet.label ?? "Your wallet")}
              subtitle={short(wallet.address)}
              right={<Text style={styles.total}>{total}</Text>}
              chevron
              onPress={() => navigation.navigate("Bag")}
              label="Open your bag"
            />
            <Row title="Copy address" onPress={() => void copy(wallet.address)} />
            <View style={styles.walletActions}>
              {wallet.kind === "watch" ? (
                <>
                  <Text style={styles.walletNote}>You can see this bag but not trade from it.</Text>
                  <Button label="Connect your wallet" onPress={() => navigation.navigate("Connect")} />
                  <Button label="Stop tracking" kind="quiet" onPress={disconnect} />
                </>
              ) : (
                <View style={styles.pair}>
                  <Button label="Add cash" onPress={() => navigation.navigate("Deposit")} style={styles.half} />
                  <Button label="Disconnect" kind="quiet" onPress={disconnect} style={styles.half} />
                </View>
              )}
            </View>
          </Group>
        ) : (
          <Group>
            <View style={styles.connect}>
              <Text style={styles.connectTitle}>Ape in two taps from any post</Text>
              <Text style={styles.walletNote}>Connect the wallet on this phone. It approves every trade, and Spot never sees your keys.</Text>
              <Button label="Connect wallet" onPress={() => navigation.navigate("Connect")} style={styles.connectButton} />
            </View>
          </Group>
        )}

        <Section>Buying</Section>
        <Group>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Starting amount</Text>
            <Text style={styles.blockNote}>What every ape starts at. Change it on any coin.</Text>
            <View style={styles.pills}>
              {CHIPS.map((c) => (
                <Pill key={c} label={`$${c}`} on={settings.defaultAmount === c} onPress={() => store.setSettings({ defaultAmount: c })} />
              ))}
            </View>
          </View>
          <SettingRow title="Never round-trip a 2x" note="Spot sells half at 2x on every new buy, so your money comes back.">
            <Toggle label="Never round-trip a 2x" value={settings.tpDefault} onChange={(tpDefault) => store.setSettings({ tpDefault })} />
          </SettingRow>
          <SettingRow title="I'm in the US" note="Hides the buy on stock coins that can't be sold in the US.">
            <Toggle label="I'm in the US" value={settings.usPerson} onChange={(usPerson) => store.setSettings({ usPerson })} />
          </SettingRow>
        </Group>

        <Section>App</Section>
        <Group>
          <SettingRow title="Vibrate on tap">
            <Toggle label="Vibrate on tap" value={settings.haptics} onChange={(haptics) => store.setSettings({ haptics })} />
          </SettingRow>
          {LINKS.map((l) => (
            <Row key={l.url} title={l.label} subtitle={l.note} right={<OutIcon />} onPress={() => void Linking.openURL(l.url).catch(() => {})} />
          ))}
        </Group>

        <Text style={styles.version}>
          Spot {version}
          {build ? ` (${build})` : ""}. Sniffs are free. Spot never holds your coins.
        </Text>
      </ScrollView>
      {toastNode}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 48 },
  profile: { flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18 },
  profileText: { flex: 1, minWidth: 0 },
  since: { fontFamily: font.displayBold, fontSize: 20, lineHeight: 24, color: color.white },
  who: { marginTop: 3, fontFamily: font.mono, fontSize: 13, color: color.faint },
  score: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 28 },
  scoreN: { fontFamily: font.display, fontSize: 72, lineHeight: 74, letterSpacing: -2, color: color.white },
  scoreHot: { color: color.orange },
  scoreText: { flex: 1 },
  scoreLabel: { fontFamily: font.display, fontSize: type.headline, lineHeight: 28, color: color.white },
  scoreProof: { marginTop: 4, fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.dim },
  total: { fontFamily: font.displayBold, fontSize: 17, color: color.white },
  walletActions: { gap: 10, padding: 16 },
  walletNote: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.dim },
  pair: { flexDirection: "row", gap: 10 },
  half: { flex: 1 },
  connect: { padding: 18 },
  connectTitle: { marginBottom: 6, fontFamily: font.displayBold, fontSize: 19, color: color.white },
  connectButton: { marginTop: 16 },
  block: { paddingVertical: 16, paddingHorizontal: 16 },
  blockTitle: { fontFamily: font.bodyBold, fontSize: type.body, color: color.white },
  blockNote: { marginTop: 2, fontFamily: font.body, fontSize: 13.5, lineHeight: 18, color: color.faint },
  pills: { flexDirection: "row", gap: 8, marginTop: 12 },
  version: { marginTop: 28, textAlign: "center", fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.faint },
});
