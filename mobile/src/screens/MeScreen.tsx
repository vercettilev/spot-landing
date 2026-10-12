import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button, Card, Pill, PuppyIcon, Section, SettingRow, Title, Toggle, tap, useToast } from "../components/ui";
import { useHoldings } from "../holdings";
import { CHIPS, money } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { useStore } from "../store";
import { color, font } from "../theme";
import { short } from "../wallet/base58";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Me">, NativeStackScreenProps<RootParams>>;

const LINKS = [
  { label: "Spot on X", note: "@usespotdotfun", url: "https://x.com/usespotdotfun" },
  { label: "usespot.fun", note: "The site", url: "https://www.usespot.fun" },
  { label: "Privacy", note: "What Spot keeps", url: "https://www.usespot.fun/privacy" },
];

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function month(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "today" : `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * ME: the puppy's view of you. What Spot has sniffed for you and what it
 * kept you out of, the wallet this phone trades from, and the few choices
 * the buy sheet starts with. No account: it all lives on this phone.
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

  return (
    <View style={styles.fill}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Me</Title>

        <View style={styles.profile}>
          <PuppyIcon size={64} />
          <View style={styles.profileText}>
            <Text style={styles.since}>Degen since {month(settings.since)}</Text>
            <Text style={styles.who} numberOfLines={1}>
              {wallet ? `${wallet.kind === "watch" ? "Tracking " : ""}${short(wallet.address)}${wallet.label ? ` · ${wallet.label}` : ""}` : "No wallet yet"}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat n={stats.sniffed} label="Sniffed" />
          <Stat n={stats.dodged} label="Scams dodged" hot />
          <Stat n={stats.apes} label="Aped" />
        </View>

        <Section>Wallet</Section>
        {wallet ? (
          <Card>
            <View style={styles.walletHead}>
              <View style={styles.walletText}>
                <Text style={styles.walletTitle}>{wallet.kind === "watch" ? "Tracking a wallet" : (wallet.label ?? "Your wallet")}</Text>
                <Pressable onPress={() => void copy(wallet.address)} hitSlop={8} accessibilityRole="button" accessibilityLabel="Copy address">
                  <Text style={styles.walletAddr}>{short(wallet.address)} · copy</Text>
                </Pressable>
              </View>
              <Pressable onPress={() => navigation.navigate("Bag")} hitSlop={8} accessibilityRole="button" style={styles.walletBag}>
                <Text style={styles.walletValue}>{bag.value ? money(bag.value.totalUsd) : "…"}</Text>
                <Text style={styles.walletBagLabel}>Bag →</Text>
              </Pressable>
            </View>
            {wallet.kind === "watch" ? (
              <Text style={styles.walletNote}>You can see its bag but not trade from it. Connect your own wallet to trade.</Text>
            ) : null}
            <View style={wallet.kind === "watch" ? styles.walletActionsStacked : styles.walletActions}>
              {wallet.kind === "watch" ? (
                <Button label="Connect your wallet" kind="go" onPress={() => navigation.navigate("Connect")} />
              ) : (
                <Button label="Add cash" kind="go" onPress={() => navigation.navigate("Deposit")} style={styles.walletAction} />
              )}
              <Button label={wallet.kind === "watch" ? "Stop tracking" : "Disconnect"} kind="quiet" onPress={disconnect} style={wallet.kind === "watch" ? undefined : styles.walletAction} />
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={styles.walletTitle}>Connect your wallet</Text>
            <Text style={styles.walletNote}>The wallet on this phone: Seeker's own, Phantom or Solflare. Spot never sees your keys.</Text>
            <Button label="Connect wallet" onPress={() => navigation.navigate("Connect")} style={styles.connect} />
          </Card>
        )}

        <Section>Buying</Section>
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Starting amount</Text>
          <Text style={styles.blockNote}>What Spot puts in when you ape. You can change it on each coin.</Text>
          <View style={styles.pills}>
            {CHIPS.map((c) => (
              <Pill key={c} label={`$${c}`} on={settings.defaultAmount === c} onPress={() => store.setSettings({ defaultAmount: c })} />
            ))}
          </View>
        </View>
        <SettingRow title="Sell half at 2x" note="On for every new buy: your money back when it doubles. You can turn it off on each coin.">
          <Toggle label="Sell half at 2x" value={settings.tpDefault} onChange={(tpDefault) => store.setSettings({ tpDefault })} />
        </SettingRow>
        <SettingRow title="I'm in the US" note="Hides the buy on stock coins that can't be sold to people in the US.">
          <Toggle label="I'm in the US" value={settings.usPerson} onChange={(usPerson) => store.setSettings({ usPerson })} />
        </SettingRow>

        <Section>App</Section>
        <SettingRow title="Vibrate on tap" note="A little buzz on every button.">
          <Toggle label="Vibrate on tap" value={settings.haptics} onChange={(haptics) => store.setSettings({ haptics })} />
        </SettingRow>
        {LINKS.map((l) => (
          <Pressable
            key={l.url}
            onPress={() => {
              tap();
              void Linking.openURL(l.url).catch(() => {});
            }}
            style={({ pressed }) => [styles.link, pressed && styles.linkPressed]}
            accessibilityRole="link"
          >
            <Text style={styles.linkLabel}>{l.label}</Text>
            <Text style={styles.linkNote}>{l.note} ↗</Text>
          </Pressable>
        ))}

        <Text style={styles.version}>
          Spot {version}
          {build ? ` (${build})` : ""} · sniffs are free · Spot never holds your coins
        </Text>
      </ScrollView>
      {toastNode}
    </View>
  );
}

function Stat({ n, label, hot }: { n: number; label: string; hot?: boolean }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statN, hot && n > 0 && styles.statHot]}>{n}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 48 },
  profile: { flexDirection: "row", alignItems: "center", gap: 16, marginTop: 18 },
  profileText: { flex: 1, minWidth: 0 },
  since: { fontFamily: font.display, fontSize: 22, lineHeight: 26, color: color.white },
  who: { marginTop: 4, fontFamily: font.mono, fontSize: 13, color: color.faint },
  stats: { flexDirection: "row", gap: 10, marginTop: 20 },
  stat: { flex: 1, paddingVertical: 14, paddingHorizontal: 12, borderRadius: 18, backgroundColor: color.ink2, borderWidth: 1, borderColor: color.line },
  statN: { fontFamily: font.display, fontSize: 30, lineHeight: 34, color: color.white },
  statHot: { color: color.orange },
  statLabel: { marginTop: 2, fontFamily: font.bodySemi, fontSize: 13.5, color: color.faint },
  walletHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  walletText: { flex: 1, minWidth: 0 },
  walletTitle: { fontFamily: font.bodyBold, fontSize: 17, color: color.white },
  walletAddr: { marginTop: 4, fontFamily: font.mono, fontSize: 13, color: color.dim },
  walletBag: { alignItems: "flex-end" },
  walletValue: { fontFamily: font.displayBold, fontSize: 20, color: color.white },
  walletBagLabel: { marginTop: 2, fontFamily: font.bodySemi, fontSize: 13, color: color.orange },
  walletNote: { marginTop: 10, fontFamily: font.body, fontSize: 14.5, lineHeight: 20, color: color.dim },
  walletActions: { flexDirection: "row", gap: 10, marginTop: 16 },
  walletActionsStacked: { gap: 10, marginTop: 16 },
  walletAction: { flex: 1, height: 52 },
  connect: { marginTop: 16 },
  block: { paddingBottom: 14, borderBottomWidth: 1, borderColor: color.line },
  blockTitle: { fontFamily: font.bodyBold, fontSize: 16, color: color.white },
  blockNote: { marginTop: 2, fontFamily: font.body, fontSize: 13.5, lineHeight: 18, color: color.faint },
  pills: { flexDirection: "row", gap: 8, marginTop: 12 },
  link: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 16, borderBottomWidth: 1, borderColor: color.line },
  linkPressed: { opacity: 0.6 },
  linkLabel: { fontFamily: font.bodyBold, fontSize: 16, color: color.white },
  linkNote: { fontFamily: font.body, fontSize: 14, color: color.faint },
  version: { marginTop: 26, textAlign: "center", fontFamily: font.mono, fontSize: 11.5, lineHeight: 17, color: color.faint },
});
