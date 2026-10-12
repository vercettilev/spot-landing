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
    toast(wallet?.kind === "watch" ? "Stopped watching." : "Disconnected. Your coins stay in your wallet.");
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
              {wallet ? `${wallet.kind === "watch" ? "Watching " : ""}${short(wallet.address)}${wallet.label ? ` · ${wallet.label}` : ""}` : "No wallet yet"}
            </Text>
          </View>
        </View>

        <View style={styles.stats}>
          <Stat n={stats.sniffed} label="Sniffed" />
          <Stat n={stats.dodged} label="Dodged" hot />
          <Stat n={stats.apes} label="Aped" />
        </View>

        <Section>Wallet</Section>
        {wallet ? (
          <Card>
            <View style={styles.walletHead}>
              <View style={styles.walletText}>
                <Text style={styles.walletTitle}>{wallet.kind === "watch" ? "Watching an address" : (wallet.label ?? "Wallet on this phone")}</Text>
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
              <Text style={styles.walletNote}>Spot shows what it holds. To trade, connect the wallet that signs.</Text>
            ) : null}
            <View style={styles.walletActions}>
              {wallet.kind === "watch" ? (
                <Button label="Connect" kind="go" onPress={() => navigation.navigate("Connect")} style={styles.walletAction} />
              ) : (
                <Button label="Deposit" kind="go" onPress={() => navigation.navigate("Deposit")} style={styles.walletAction} />
              )}
              <Button label={wallet.kind === "watch" ? "Stop" : "Disconnect"} kind="quiet" onPress={disconnect} style={styles.walletAction} />
            </View>
          </Card>
        ) : (
          <Card>
            <Text style={styles.walletTitle}>Connect the wallet on this phone</Text>
            <Text style={styles.walletNote}>Seed Vault on a Seeker, Phantom or Solflare. Spot asks it to sign each trade and never sees a key.</Text>
            <Button label="Connect a wallet" onPress={() => navigation.navigate("Connect")} style={styles.connect} />
          </Card>
        )}

        <Section>Buying</Section>
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Default buy</Text>
          <Text style={styles.blockNote}>What the buy sheet starts at, in USDC.</Text>
          <View style={styles.pills}>
            {CHIPS.map((c) => (
              <Pill key={c} label={`$${c}`} on={settings.defaultAmount === c} onPress={() => store.setSettings({ defaultAmount: c })} />
            ))}
          </View>
        </View>
        <SettingRow title="Take profit on every buy" note="Sells half at 2x. Switch it off per buy on the sheet.">
          <Toggle label="Take profit on every buy" value={settings.tpDefault} onChange={(tpDefault) => store.setSettings({ tpDefault })} />
        </SettingRow>
        <SettingRow title="I'm a US person" note="Hides the buy on tokenized stocks whose issuers don't sell to US persons.">
          <Toggle label="I'm a US person" value={settings.usPerson} onChange={(usPerson) => store.setSettings({ usPerson })} />
        </SettingRow>

        <Section>App</Section>
        <SettingRow title="Haptics" note="A tap you can feel on every button.">
          <Toggle label="Haptics" value={settings.haptics} onChange={(haptics) => store.setSettings({ haptics })} />
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
          {build ? ` (${build})` : ""} · sniffs are free, Spot never holds your coins
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
