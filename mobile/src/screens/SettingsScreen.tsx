import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import Constants from "expo-constants";
import { useEffect, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { CoinFace, Group, OutIcon, Pill, Row, Section, SettingRow, Sheet, Toggle, useRouteSheet, useToast } from "../components/ui";
import { useHoldings } from "../holdings";
import { ago, CHIPS, money } from "../logic";
import type { RootParams } from "../navigation";
import { tradeLine } from "../pnl";
import { AUTO_SELL } from "../soon";
import { useStore } from "../store";
import { color, font, leading, size, space, type } from "../theme";
import { checkForUpdate, type Update } from "../updates";
import { short } from "../wallet/base58";

type Props = NativeStackScreenProps<RootParams, "Settings">;

const LINKS = [
  { label: "Spot on X", note: "@usespotdotfun", url: "https://x.com/usespotdotfun" },
  { label: "usespot.fun", note: null, url: "https://www.usespot.fun" },
  { label: "Privacy", note: "What Spot keeps, and doesn't", url: "https://www.usespot.fun/privacy" },
  { label: "Terms", note: "The deal, in plain words", url: "https://www.usespot.fun/terms" },
];

/* How many trades show before "Show all". */
const RECENT_TRADES = 5;

/**
 * SETTINGS, as a sheet behind Home's puppy: the wallet this phone trades
 * from, every trade Spot made with it (each a tap from Solscan), the few
 * choices every buy starts with, and the app's links. No account: it all
 * lives on this phone.
 */
export function SettingsScreen({ navigation }: Props) {
  const { ref, onDismiss } = useRouteSheet(navigation);
  const store = useStore();
  const { wallet, settings, trades } = store;
  const bag = useHoldings(wallet?.address ?? null);
  const [toastNode, toast] = useToast();
  /* The latest trades, the rest a tap away. */
  const [allTrades, setAllTrades] = useState(false);
  const version = Constants.expoConfig?.version ?? "0.1.0";
  const build = Constants.expoConfig?.android?.versionCode;
  const [update, setUpdate] = useState<Update | null>(null);
  const mine = trades.filter((t) => t.owner === wallet?.address);

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

  return (
    <View style={styles.fill}>
      <Sheet ref={ref} visible onDismiss={onDismiss} title="Settings" label="Settings">
        <Section>Wallet</Section>
        {wallet ? (
          <Group>
            <Row
              title={wallet.kind === "watch" ? "Tracking a wallet" : (wallet.label ?? "Your wallet")}
              subtitle={short(wallet.address)}
              right={<Text style={styles.total}>{bag.value ? money(bag.value.totalUsd) : "…"}</Text>}
            />
            <Row title="Copy address" onPress={() => void copy(wallet.address)} />
            {wallet.kind === "watch" ? (
              <Row title="Connect your wallet" subtitle="You can see this bag but not trade from it." tint={color.orange} chevron onPress={() => navigation.navigate("Connect")} />
            ) : null}
            <Row
              title={wallet.kind === "watch" ? "Stop tracking" : "Disconnect"}
              subtitle={wallet.kind === "watch" ? null : "Your coins stay in your wallet."}
              onPress={disconnect}
            />
          </Group>
        ) : (
          <Group>
            <Row title="Connect wallet" tint={color.orange} chevron onPress={() => navigation.navigate("Connect")} />
            <Row title="Track a wallet" subtitle="See any wallet's bag, without trading." chevron onPress={() => navigation.navigate("Connect", { track: true })} />
          </Group>
        )}

        {mine.length > 0 ? (
          <>
            <Section>Trades</Section>
            <Group>
              {mine.slice(0, allTrades ? 50 : RECENT_TRADES).map((t) => {
                const what = `${t.side === "buy" ? "Aped" : "Sold"} $${t.symbol}`;
                return (
                  <Row
                    key={t.id}
                    left={<CoinFace uri={t.icon} symbol={t.symbol} size={size.faceRow} />}
                    title={what}
                    subtitle={tradeLine(t)}
                    right={
                      <View style={styles.tradeRight}>
                        <Text style={styles.ago}>{ago(t.at)}</Text>
                        {t.signature ? <OutIcon /> : null}
                      </View>
                    }
                    onPress={t.signature ? () => void Linking.openURL(`https://solscan.io/tx/${t.signature}`).catch(() => {}) : undefined}
                    label={`${what}, ${tradeLine(t)}${t.signature ? ". Opens Solscan." : ""}`}
                  />
                );
              })}
              {!allTrades && mine.length > RECENT_TRADES ? (
                <Row title={`Show all ${Math.min(mine.length, 50)} trades`} tint={color.orange} chevron onPress={() => setAllTrades(true)} />
              ) : null}
            </Group>
          </>
        ) : null}

        <Section>Buying</Section>
        <Group>
          <View style={styles.block}>
            <Text style={styles.blockTitle}>Starting amount</Text>
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
            <Toggle label="I'm in the US" value={settings.usPerson} onChange={(usPerson) => store.setSettings({ usPerson, usAsked: true })} />
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
          {build ? ` (${build})` : ""}. Spot never holds your coins.
        </Text>
      </Sheet>
      {toastNode}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  total: { fontFamily: font.displayBold, fontSize: type.body, color: color.white },
  tradeRight: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  ago: { fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  block: { paddingVertical: space.x4, paddingHorizontal: space.x4 },
  blockTitle: { fontFamily: font.bodyBold, fontSize: type.body, color: color.white },
  pills: { flexDirection: "row", gap: space.x2, marginTop: space.x3 },
  version: { marginTop: space.x7, marginBottom: space.x2, textAlign: "center", fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
});
