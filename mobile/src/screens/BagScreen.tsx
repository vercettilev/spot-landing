import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { errorLine } from "../api";
import { Breathing, Button, Card, CoinFace, PuppyIcon, Section, Title, tap } from "../components/ui";
import { useHoldings } from "../holdings";
import { amount as fmtAmount, money, pct, usd } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { useStore } from "../store";
import { color, font } from "../theme";
import { short } from "../wallet/base58";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Bag">, NativeStackScreenProps<RootParams>>;

/**
 * THE BAG: what the connected wallet holds, priced, biggest first. USDC is
 * what Spot buys with, SOL is shown as cash next to it, and every coin
 * opens on its own sheet with the Sell side ready.
 */
export function BagScreen({ navigation }: Props) {
  const { wallet } = useStore();
  const bag = useHoldings(wallet?.address ?? null);

  if (!wallet) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Bag</Title>
        <Card style={styles.empty}>
          <PuppyIcon size={64} />
          <Text style={styles.emptyTitle}>Nothing to sniff in here yet.</Text>
          <Text style={styles.emptyLine}>
            Connect the wallet on this phone (Seed Vault on a Seeker, Phantom, Solflare) to see your coins and sell from Spot. Or watch any address.
          </Text>
          <Button label="Connect a wallet" onPress={() => navigation.navigate("Connect")} style={styles.emptyButton} />
        </Card>
      </ScrollView>
    );
  }

  const b = bag.value;
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={bag.status === "loading"} onRefresh={() => void bag.refresh()} tintColor={color.orange} />}
    >
      <View style={styles.head}>
        <Title>Bag</Title>
        <Pressable onPress={() => navigation.navigate("Me")} hitSlop={8} accessibilityRole="button">
          <Text style={styles.addr}>
            {wallet.kind === "watch" ? "Watching " : ""}
            {short(wallet.address)}
          </Text>
        </Pressable>
      </View>

      {bag.status === "loading" && !b ? (
        <Breathing style={styles.loading}>
          <Text style={styles.total}>$…</Text>
          <Text style={styles.totalNote}>Counting the bag…</Text>
        </Breathing>
      ) : bag.status === "error" && !b ? (
        <Card style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn't count the bag.</Text>
          <Text style={styles.emptyLine}>{bag.error ? errorLine(bag.error) : "Try again."}</Text>
          <Button label="Try again" kind="quiet" onPress={() => void bag.refresh()} style={styles.emptyButton} />
        </Card>
      ) : b ? (
        <>
          <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
            {money(b.totalUsd)}
          </Text>
          <Text style={styles.totalNote}>
            {b.positions.length} coin{b.positions.length === 1 ? "" : "s"} · {usd(b.usdc.usd)} USDC ready to ape
          </Text>
          <View style={styles.actions}>
            <Button label="Deposit" kind="quiet" onPress={() => navigation.navigate("Deposit")} style={styles.action} />
            <Button label="Sniff a coin" kind="go" onPress={() => navigation.navigate("Sniff")} style={styles.action} />
          </View>

          <Section>Cash</Section>
          <Row symbol="USDC" name="Dollars, on Solana" amount={b.usdc.amount} value={b.usdc.usd} />
          <Row symbol="SOL" name="Solana's own coin" amount={b.sol.amount} value={b.sol.usd} />

          <Section>Coins</Section>
          {b.positions.length === 0 ? (
            <Text style={styles.none}>No coins yet. Share a post with a CA to Spot and ape from there.</Text>
          ) : (
            b.positions.map((p) => (
              <Pressable
                key={p.token.mint}
                onPress={() => {
                  tap();
                  navigation.navigate("Coin", { candidate: { token: p.token, via: "link" }, source: null, share: null, others: [] });
                }}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                accessibilityRole="button"
              >
                <CoinFace uri={p.token.icon} symbol={p.token.symbol} size={42} />
                <View style={styles.rowText}>
                  <Text style={styles.rowSymbol} numberOfLines={1}>
                    ${p.token.symbol}
                  </Text>
                  <Text style={styles.rowName} numberOfLines={1}>
                    {fmtAmount(p.amount)} {p.token.symbol}
                  </Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={styles.rowValue}>{usd(p.usd)}</Text>
                  <Text style={[styles.rowChange, { color: (p.token.change24hPct ?? 0) >= 0 ? color.green : color.red }]}>{pct(p.token.change24hPct)}</Text>
                </View>
              </Pressable>
            ))
          )}
          {b.hidden > 0 && <Text style={styles.hidden}>+ {b.hidden} token{b.hidden === 1 ? "" : "s"} too small or without a price, not shown.</Text>}
        </>
      ) : null}
    </ScrollView>
  );
}

function Row({ symbol, name, amount, value }: { symbol: string; name: string; amount: number; value: number | null }) {
  return (
    <View style={styles.row}>
      <View style={styles.cashFace}>
        <Text style={styles.cashLetter}>{symbol === "USDC" ? "$" : "◎"}</Text>
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowSymbol}>{symbol}</Text>
        <Text style={styles.rowName}>{name}</Text>
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowValue}>{value === null ? "—" : usd(value)}</Text>
        <Text style={styles.rowAmount}>{fmtAmount(amount)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40 },
  head: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  addr: { marginBottom: 6, fontFamily: font.mono, fontSize: 13, color: color.faint },
  empty: { alignItems: "center", marginTop: 24, paddingVertical: 28 },
  emptyTitle: { marginTop: 16, textAlign: "center", fontFamily: font.display, fontSize: 24, color: color.white },
  emptyLine: { marginTop: 10, textAlign: "center", fontFamily: font.body, fontSize: 15.5, lineHeight: 22, color: color.dim },
  emptyButton: { alignSelf: "stretch", marginTop: 22 },
  loading: { marginTop: 12 },
  total: { marginTop: 14, fontFamily: font.display, fontSize: 56, lineHeight: 60, letterSpacing: -2, color: color.white },
  totalNote: { marginTop: 4, fontFamily: font.bodySemi, fontSize: 15, color: color.dim },
  actions: { flexDirection: "row", gap: 10, marginTop: 20 },
  action: { flex: 1 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: color.ink2,
    borderWidth: 1,
    borderColor: color.line,
  },
  rowPressed: { backgroundColor: color.ink3 },
  rowText: { flex: 1, minWidth: 0 },
  rowSymbol: { fontFamily: font.displayBold, fontSize: 17, color: color.white },
  rowName: { marginTop: 1, fontFamily: font.body, fontSize: 13, color: color.faint },
  rowRight: { alignItems: "flex-end" },
  rowValue: { fontFamily: font.displayBold, fontSize: 16, color: color.white },
  rowChange: { marginTop: 2, fontFamily: font.bodyBold, fontSize: 13 },
  rowAmount: { marginTop: 2, fontFamily: font.mono, fontSize: 12, color: color.faint },
  cashFace: { width: 42, height: 42, borderRadius: 21, backgroundColor: color.ink3, alignItems: "center", justifyContent: "center" },
  cashLetter: { fontFamily: font.display, fontSize: 18, color: color.white },
  none: { fontFamily: font.body, fontSize: 15, lineHeight: 21, color: color.faint },
  hidden: { marginTop: 6, fontFamily: font.body, fontSize: 13, color: color.faint },
});
