import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Card, CoinFace, Pill, Section, Title, tap } from "../components/ui";
import { ago } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { useStore, type ActivityItem, type AlertKind } from "../store";
import { color, font } from "../theme";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Alerts">, NativeStackScreenProps<RootParams>>;

const KINDS: { kind: AlertKind; label: string }[] = [
  { kind: "dev", label: "Dev dumps" },
  { kind: "liquidity", label: "Rug pull" },
  { kind: "tp", label: "Hits 2x" },
];

/* Line icons drawn like the tab bar's, in the one orange. */
const ICON: Record<ActivityItem["kind"], string> = {
  sniff: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.6-4.6",
  ape: "M12 19V5M5.5 11.5 12 5l6.5 6.5",
  sell: "M12 5v14M5.5 12.5 12 19l6.5-6.5",
  watch: "M12 3.8l2.5 5.1 5.6.8-4 4 .9 5.6-5-2.7-5 2.7.9-5.6-4-4 5.6-.8z",
  connect: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
};

function ActivityIcon({ kind }: { kind: ActivityItem["kind"] }) {
  return (
    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color.orange} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICON[kind]} />
    </Svg>
  );
}

/**
 * WHAT SPOT WATCHES, AND WHAT HAPPENED. The landing promises a growl when
 * a coin turns (the dev selling, the pool pulled) and take profit when it
 * doubles. The rules are set here per coin; the watching itself runs on
 * the server with push notifications, which are not built yet, and this
 * screen says so rather than pretending.
 */
export function AlertsScreen({ navigation }: Props) {
  const store = useStore();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Title>Alerts</Title>

      <Card style={styles.note}>
        <Text style={styles.noteTitle}>Spot barks when a coin turns.</Text>
        <Text style={styles.noteLine}>
          Coming soon: a ping to sell when the dev dumps or the coin gets rugged. Pick your alerts now, they carry over.
        </Text>
      </Card>

      <Section>Coins you watch</Section>
      {store.watch.length === 0 ? (
        <Text style={styles.empty}>Tap ☆ on any coin to watch it. Coins you ape get watched too.</Text>
      ) : (
        store.watch.map((w) => (
          <View key={w.mint} style={styles.watch}>
            <Pressable
              onPress={() => {
                tap();
                navigation.navigate("Coin", {
                  candidate: {
                    token: { mint: w.mint, symbol: w.symbol, name: w.name, icon: w.icon, decimals: 0, kind: "coin", priceUsd: null, mcapUsd: null, liquidityUsd: null, holders: null, change24hPct: null, verified: false, issuer: null, restrictions: [] },
                    via: "link",
                  },
                  source: null,
                  share: null,
                  others: [],
                });
              }}
              style={styles.watchHead}
              accessibilityRole="button"
            >
              <CoinFace uri={w.icon} symbol={w.symbol} size={36} />
              <Text style={styles.watchSymbol} numberOfLines={1}>
                ${w.symbol}
              </Text>
              <Text style={styles.watchSince}>since {ago(w.since)}</Text>
            </Pressable>
            <View style={styles.kinds}>
              {KINDS.map((k) => (
                <Pill key={k.kind} label={k.label} on={w.alerts[k.kind]} onPress={() => store.setAlert(w.mint, k.kind, !w.alerts[k.kind])} />
              ))}
            </View>
          </View>
        ))
      )}

      <Section>Activity</Section>
      {store.activity.length === 0 ? (
        <Text style={styles.empty}>Your apes, sells and watches show up here.</Text>
      ) : (
        store.activity.slice(0, 50).map((a) => (
          <View key={a.id} style={styles.activity}>
            <View style={styles.activityIcon}>
              <ActivityIcon kind={a.kind} />
            </View>
            <Text style={styles.activityText} numberOfLines={2}>
              {a.text}
            </Text>
            <Text style={styles.activityAgo}>{ago(a.at)}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  note: { marginTop: 16, borderColor: "rgba(252, 78, 2, 0.45)" },
  noteTitle: { fontFamily: font.display, fontSize: 20, color: color.white },
  noteLine: { marginTop: 6, fontFamily: font.body, fontSize: 14.5, lineHeight: 20, color: color.dim },
  empty: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.faint },
  watch: { padding: 14, marginBottom: 10, borderRadius: 18, backgroundColor: color.ink2, borderWidth: 1, borderColor: color.line },
  watchHead: { flexDirection: "row", alignItems: "center", gap: 10 },
  watchSymbol: { flex: 1, fontFamily: font.displayBold, fontSize: 18, color: color.white },
  watchSince: { fontFamily: font.mono, fontSize: 12, color: color.faint },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  activity: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderColor: color.line },
  activityIcon: { width: 26, alignItems: "center" },
  activityText: { flex: 1, fontFamily: font.bodySemi, fontSize: 15, color: color.white },
  activityAgo: { fontFamily: font.mono, fontSize: 12, color: color.faint },
});
