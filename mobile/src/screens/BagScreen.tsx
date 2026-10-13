import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { errorLine } from "../api";
import { Breathing, Button, CoinFace, Group, PuppyIcon, Row, Section, Title } from "../components/ui";
import { useHoldings } from "../holdings";
import { ago, amount as fmtAmount, money, pct, usd } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { books, gain, pnlOf, since, sinceLine, tradeLine } from "../pnl";
import { useStore } from "../store";
import { color, font, space, type } from "../theme";
import { short } from "../wallet/base58";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Bag">, NativeStackScreenProps<RootParams>>;

/**
 * THE BAG: what the wallet is worth, then what it is made of, then what
 * Spot did with it. The total is the one loud thing; under it, in one
 * colour, what your apes made. Cash (USDC, the digital dollar Spot buys
 * with, and SOL) and the coins sit below as quiet lists, each coin one tap
 * from its page with the Sell side ready and its own gain since you aped;
 * then every trade, each a tap from Solscan.
 */
export function BagScreen({ navigation }: Props) {
  const { wallet, trades } = useStore();
  const bag = useHoldings(wallet?.address ?? null);
  const mine = trades.filter((t) => t.owner === wallet?.address);
  const ledger = books(mine);

  if (!wallet) {
    return (
      <ScrollView contentContainerStyle={styles.scroll}>
        <Title>Bag</Title>
        <View style={styles.empty}>
          <PuppyIcon size={72} />
          <Text style={styles.emptyTitle}>No bag yet.</Text>
          <Text style={styles.emptyLine}>Connect the wallet on this phone and your coins show up here, each one a tap from selling.</Text>
          <Button label="Connect wallet" onPress={() => navigation.navigate("Connect")} style={styles.emptyButton} />
        </View>
      </ScrollView>
    );
  }

  const b = bag.value;
  const pnl = b ? pnlOf(mine, b.positions) : null;
  const onChain = mine.some((t) => t.signature);
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={bag.status === "loading"} onRefresh={() => void bag.refresh()} tintColor={color.orange} />}
    >
      <View style={styles.head}>
        <Title>Bag</Title>
        <Pressable onPress={() => navigation.navigate("Me")} hitSlop={8} accessibilityRole="button" accessibilityLabel="Your wallet">
          <Text style={styles.addr}>
            {wallet.kind === "watch" ? "Tracking " : ""}
            {short(wallet.address)}
          </Text>
        </Pressable>
      </View>

      {bag.status === "loading" && !b ? (
        <Breathing>
          <Text style={styles.total}>$…</Text>
          <Text style={styles.totalNote}>Counting your bag…</Text>
        </Breathing>
      ) : bag.status === "error" && !b ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Couldn't load your bag.</Text>
          <Text style={styles.emptyLine}>{bag.error ? errorLine(bag.error) : "Pull down to try again."}</Text>
          <Button label="Try again" kind="quiet" onPress={() => void bag.refresh()} style={styles.emptyButton} />
        </View>
      ) : b ? (
        <>
          <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
            {money(b.totalUsd)}
          </Text>
          <Text style={styles.totalNote}>
            {b.positions.length === 0 ? "No coins yet" : `${b.positions.length} coin${b.positions.length === 1 ? "" : "s"}`} and {usd(b.usdc.usd)} ready to ape
          </Text>
          {pnl && pnl.trades > 0 && (
            <Text style={[styles.pnl, { color: pnl.all < 0 ? color.red : color.green }]}>Your apes: {gain(pnl.all)} all-time</Text>
          )}
          <View style={styles.actions}>
            <Button label="Add cash" kind="quiet" onPress={() => navigation.navigate("Deposit")} style={styles.action} />
            <Button label="Sniff a coin" kind="go" onPress={() => navigation.navigate("Sniff")} style={styles.action} />
          </View>

          <Section>Cash</Section>
          <Group>
            <Row left={<Cash glyph="$" />} title="USDC" subtitle="Digital dollars" right={<Value value={usd(b.usdc.usd)} under={fmtAmount(b.usdc.amount)} />} />
            <Row left={<Cash glyph="◎" />} title="SOL" subtitle="Solana" right={<Value value={b.sol.usd === null ? "—" : usd(b.sol.usd)} under={fmtAmount(b.sol.amount)} />} />
          </Group>

          <Section>Coins</Section>
          {b.positions.length === 0 ? (
            <Text style={styles.none}>Share any post with a coin to Spot, and your first ape lands here.</Text>
          ) : (
            <Group>
              {b.positions.map((p) => {
                /* Your own gain where Spot bought it; the coin's day where it did not. */
                const book = ledger.get(p.token.mint);
                const s = book ? since(book, p) : null;
                const under = s ? sinceLine(s) : `${pct(p.token.change24hPct)} today`;
                const down = (s ? s.usd : (p.token.change24hPct ?? 0)) < 0;
                return (
                  <Row
                    key={p.token.mint}
                    left={<CoinFace uri={p.token.icon} symbol={p.token.symbol} size={40} />}
                    title={`$${p.token.symbol}`}
                    subtitle={`${fmtAmount(p.amount)} ${p.token.symbol}`}
                    right={<Value value={usd(p.usd)} under={under} tint={down ? color.red : color.green} />}
                    onPress={() => navigation.navigate("Coin", { candidate: { token: p.token, via: "link" }, source: null, share: null, others: [] })}
                    label={`$${p.token.symbol}, ${usd(p.usd)}`}
                  />
                );
              })}
            </Group>
          )}
          {b.hidden > 0 && <Text style={styles.hidden}>Plus {b.hidden} tiny coin{b.hidden === 1 ? "" : "s"}, too small to show.</Text>}

          {mine.length > 0 && (
            <>
              <Section>Trades</Section>
              <Group>
                {mine.slice(0, 50).map((t) => {
                  const what = `${t.side === "buy" ? "Aped" : "Sold"} $${t.symbol}`;
                  return (
                    <Row
                      key={t.id}
                      left={<CoinFace uri={t.icon} symbol={t.symbol} size={40} />}
                      title={what}
                      subtitle={tradeLine(t)}
                      right={<Text style={styles.ago}>{ago(t.at)}</Text>}
                      onPress={t.signature ? () => void Linking.openURL(`https://solscan.io/tx/${t.signature}`).catch(() => {}) : undefined}
                      label={`${what}, ${tradeLine(t)}`}
                    />
                  );
                })}
              </Group>
              {onChain && <Text style={styles.hidden}>Tap a trade to see it on Solscan.</Text>}
            </>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function Cash({ glyph }: { glyph: string }) {
  return (
    <View style={styles.cash}>
      <Text style={styles.cashGlyph}>{glyph}</Text>
    </View>
  );
}

function Value({ value, under, tint }: { value: string; under: string; tint?: string }) {
  return (
    <View style={styles.value}>
      <Text style={styles.valueTop}>{value}</Text>
      <Text style={[styles.valueUnder, tint ? { color: tint } : null]}>{under}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.gutter, paddingTop: 12, paddingBottom: 48 },
  head: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  addr: { marginBottom: 8, fontFamily: font.mono, fontSize: 13, color: color.faint },
  empty: { alignItems: "center", marginTop: 56, paddingHorizontal: 8 },
  emptyTitle: { marginTop: 20, textAlign: "center", fontFamily: font.display, fontSize: type.headline, color: color.white },
  emptyLine: { marginTop: 10, maxWidth: 320, textAlign: "center", fontFamily: font.body, fontSize: type.body, lineHeight: 23, color: color.dim },
  emptyButton: { alignSelf: "stretch", marginTop: 28 },
  total: { marginTop: 18, fontFamily: font.display, fontSize: 56, lineHeight: 60, letterSpacing: -2, color: color.white },
  totalNote: { marginTop: 6, fontFamily: font.bodySemi, fontSize: type.body, color: color.dim },
  pnl: { marginTop: 4, fontFamily: font.bodyBold, fontSize: type.body },
  ago: { fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  actions: { flexDirection: "row", gap: 10, marginTop: 22 },
  action: { flex: 1 },
  cash: { width: 40, height: 40, borderRadius: 20, backgroundColor: color.ink3, alignItems: "center", justifyContent: "center" },
  cashGlyph: { fontFamily: font.display, fontSize: 17, color: color.white },
  value: { alignItems: "flex-end" },
  valueTop: { fontFamily: font.displayBold, fontSize: type.body, color: color.white },
  valueUnder: { marginTop: 2, fontFamily: font.bodySemi, fontSize: 13, color: color.faint },
  none: { marginLeft: 4, fontFamily: font.body, fontSize: type.body, lineHeight: 23, color: color.faint },
  hidden: { marginTop: 10, marginLeft: 4, fontFamily: font.body, fontSize: 13, color: color.faint },
});
