import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { CoinFace, Group, Pill, PuppyIcon, Section, Title, tap } from "../components/ui";
import { ago } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { useStore, type ActivityItem, type AlertKind } from "../store";
import { color, font, space, type } from "../theme";

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
  watch: "M18 16.5V11a6 6 0 0 0-12 0v5.5L4.5 18h15L18 16.5zM10 20.5a2 2 0 0 0 4 0",
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
 * GETTING OUT IN TIME. What the user gets comes first, on the one orange
 * panel: a ping to sell before the dev dumps or the pool is pulled. Then
 * the coins Spot keeps an eye on, each with its triggers, and what happened.
 * The pings themselves run on the server and are not built yet; the panel
 * says so rather than pretending.
 */
export function AlertsScreen({ navigation }: Props) {
  const store = useStore();
  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Title>Alerts</Title>

      <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.heroTitle}>Get out before the rug.</Text>
          <Text style={styles.heroLine}>Spot will ping you to sell when the dev dumps or the pool gets pulled. Coming soon: pick your alerts now and they carry over.</Text>
        </View>
        <PuppyIcon size={48} />
      </View>

      <Section>Coins you watch</Section>
      {store.watch.length === 0 ? (
        <Text style={styles.empty}>Tap the bell on any coin and Spot keeps an eye on it. Coins you ape are watched too.</Text>
      ) : (
        <Group>
          {store.watch.map((w) => (
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
                accessibilityLabel={`$${w.symbol}`}
              >
                <CoinFace uri={w.icon} symbol={w.symbol} size={36} />
                <Text style={styles.watchSymbol} numberOfLines={1}>
                  ${w.symbol}
                </Text>
                <Text style={styles.watchSince}>watched {ago(w.since)}</Text>
              </Pressable>
              <View style={styles.kinds}>
                {KINDS.map((k) => (
                  <Pill key={k.kind} label={k.label} on={w.alerts[k.kind]} onPress={() => store.setAlert(w.mint, k.kind, !w.alerts[k.kind])} />
                ))}
              </View>
            </View>
          ))}
        </Group>
      )}

      <Section>Activity</Section>
      {store.activity.length === 0 ? (
        <Text style={styles.empty}>Your apes, sells and watches show up here.</Text>
      ) : (
        <Group>
          {store.activity.slice(0, 50).map((a) => (
            <View key={a.id} style={styles.activity}>
              <ActivityIcon kind={a.kind} />
              <Text style={styles.activityText} numberOfLines={2}>
                {a.text}
              </Text>
              <Text style={styles.activityAgo}>{ago(a.at)}</Text>
            </View>
          ))}
        </Group>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 48 },
  hero: { flexDirection: "row", alignItems: "flex-start", gap: 14, marginTop: 18, padding: 20, borderRadius: 24, backgroundColor: color.orange },
  heroText: { flex: 1 },
  heroTitle: { fontFamily: font.display, fontSize: type.headline, lineHeight: 29, letterSpacing: -0.4, color: color.ink },
  heroLine: { marginTop: 8, fontFamily: font.bodySemi, fontSize: 15, lineHeight: 21, color: color.inkDim },
  empty: { marginLeft: 4, fontFamily: font.body, fontSize: type.body, lineHeight: 23, color: color.faint },
  watch: { paddingVertical: 14, paddingHorizontal: 16 },
  watchHead: { flexDirection: "row", alignItems: "center", gap: 12 },
  watchSymbol: { flex: 1, fontFamily: font.displayBold, fontSize: 18, color: color.white },
  watchSince: { fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  kinds: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 },
  activity: { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 56, paddingVertical: 12, paddingHorizontal: 16 },
  activityText: { flex: 1, fontFamily: font.bodySemi, fontSize: 15, lineHeight: 20, color: color.white },
  activityAgo: { fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
});
