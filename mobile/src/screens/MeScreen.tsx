import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useIsFocused, type CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Linking, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Group, OutIcon, Pill, PuppyIcon, Row, Section, SettingRow, Title, Toggle, useToast } from "../components/ui";
import { useHoldings } from "../holdings";
import { CHIPS, money } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { AUTO_SELL } from "../soon";
import { useStore } from "../store";
import { color, font, leading, size, space, tracking, type } from "../theme";
import { checkForUpdate, type Update } from "../updates";
import { short } from "../wallet/base58";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Me">, NativeStackScreenProps<RootParams>>;

const LINKS = [
  { label: "Spot on X", note: "@usespotdotfun", url: "https://x.com/usespotdotfun" },
  { label: "usespot.fun", note: null, url: "https://www.usespot.fun" },
  { label: "Privacy", note: "What Spot keeps, and doesn't", url: "https://www.usespot.fun/privacy" },
  { label: "Terms", note: "The deal, in plain words", url: "https://www.usespot.fun/terms" },
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
  /* Under a sheet, a screen reader stays in the sheet. */
  const focused = useIsFocused();
  const bag = useHoldings(wallet?.address ?? null);
  const [toastNode, toast] = useToast();
  const version = Constants.expoConfig?.version ?? "0.1.0";
  const build = Constants.expoConfig?.android?.versionCode;
  const [update, setUpdate] = useState<Update | null>(null);

  /* The test channel, once a visit: a newer build out means one more row. */
  useEffect(() => {
    let alive = true;
    void checkForUpdate(build ?? 0).then((u) => {
      if (alive) setUpdate(u);
    });
    return () => {
      alive = false;
    };
  }, [build]);

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
    <View style={styles.fill} aria-hidden={!focused}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Me</Title>

        <View style={styles.profile}>
          <PuppyIcon size={size.avatar} />
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
              <Button label="Connect wallet" onPress={() => navigation.navigate("Connect", { track: true })} style={styles.connectButton} />
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
          {AUTO_SELL && (
            <SettingRow title="Never round-trip a 2x" note="Spot sells half at 2x on every new buy, so your money comes back.">
              <Toggle label="Never round-trip a 2x" value={settings.tpDefault} onChange={(tpDefault) => store.setSettings({ tpDefault })} />
            </SettingRow>
          )}
          <SettingRow title="I'm in the US" note="Hides the buy on stock coins that can't be sold in the US.">
            <Toggle label="I'm in the US" value={settings.usPerson} onChange={(usPerson) => store.setSettings({ usPerson })} />
          </SettingRow>
        </Group>

        <Section>App</Section>
        <Group>
          {update && (
            <Row
              title={`Update to ${update.version}`}
              subtitle="Downloads the new build. Open the file to install it over this one."
              right={<OutIcon />}
              onPress={() => void Linking.openURL(update.apk).catch(() => {})}
            />
          )}
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
  scroll: { paddingHorizontal: space.gutter, paddingTop: space.x3, paddingBottom: space.x12 },
  profile: { flexDirection: "row", alignItems: "center", gap: space.x4, marginTop: space.x4 },
  profileText: { flex: 1, minWidth: 0 },
  since: { fontFamily: font.displayBold, fontSize: type.key, lineHeight: leading.key, color: color.white },
  who: { marginTop: space.hair, fontFamily: font.mono, fontSize: type.footnote, color: color.faint },
  score: { flexDirection: "row", alignItems: "center", gap: space.x4, marginTop: space.x7 },
  scoreN: { fontFamily: font.display, fontSize: type.moment, lineHeight: leading.moment, letterSpacing: tracking.figure, color: color.white },
  scoreHot: { color: color.orange },
  scoreText: { flex: 1 },
  scoreLabel: { fontFamily: font.display, fontSize: type.headline, lineHeight: leading.headline, color: color.white },
  scoreProof: { marginTop: space.x1, fontFamily: font.body, fontSize: type.callout, lineHeight: leading.callout, color: color.dim },
  total: { fontFamily: font.displayBold, fontSize: type.body, color: color.white },
  walletActions: { gap: space.x3, padding: space.x4 },
  walletNote: { fontFamily: font.body, fontSize: type.callout, lineHeight: leading.callout, color: color.dim },
  pair: { flexDirection: "row", gap: space.x2 },
  half: { flex: 1 },
  connect: { padding: space.x4 },
  connectTitle: { marginBottom: space.x2, fontFamily: font.displayBold, fontSize: type.key, color: color.white },
  connectButton: { marginTop: space.x4 },
  block: { paddingVertical: space.x4, paddingHorizontal: space.x4 },
  blockTitle: { fontFamily: font.bodyBold, fontSize: type.body, color: color.white },
  blockNote: { marginTop: space.hair, fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
  pills: { flexDirection: "row", gap: space.x2, marginTop: space.x3 },
  version: { marginTop: space.x7, textAlign: "center", fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
});
