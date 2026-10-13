import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useIsFocused, type CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useState } from "react";
import { Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { errorLine } from "../api";
import { Breathing, Button, CoinFace, Group, PuppyIcon, Row, Section, Title } from "../components/ui";
import { useHoldings } from "../holdings";
import { ago, amount as fmtAmount, bagLine, emptyBag, money, pct, usd } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { books, gain, pnlOf, since, sinceLine, tradeLine } from "../pnl";
import { useStore } from "../store";
import { color, font, leading, size, space, tracking, type } from "../theme";
import { short } from "../wallet/base58";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Bag">, NativeStackScreenProps<RootParams>>;

/**
 * THE BAG: what the wallet is worth, then what it is made of, then what
 * Spot did with it. The total is the one loud thing; under it, in the
 * colour of the outcome, what your apes made (green a win; a loss is said
 * plainly, never in red). Cash (USDC, the digital dollar Spot buys with,
 * and SOL) and the coins sit below as quiet lists, each coin one tap from
 * its page opened on Sell, with its own gain since you aped; then every
 * trade, each a tap from Solscan. An empty wallet gets one thing to do:
 * Add cash.
 */
export function BagScreen({ navigation }: Props) {
  const { wallet, trades } = useStore();
  /* Under a sheet, a screen reader stays in the sheet. */
  const away = !useIsFocused();
  /* The latest trades, the rest a tap away: a long list buries the bag above it. */
  const [allTrades, setAllTrades] = useState(false);
  const bag = useHoldings(wallet?.address ?? null);
  const mine = trades.filter((t) => t.owner === wallet?.address);
  const ledger = books(mine);

  if (!wallet) {
    return (
      <ScrollView contentContainerStyle={styles.scroll} aria-hidden={away}>
        <Title>Bag</Title>
        <View style={styles.empty}>
          <PuppyIcon size={size.markEmpty} />
          <Text style={styles.emptyTitle}>No bag yet.</Text>
          <Text style={styles.emptyLine}>Connect the wallet on this phone and your coins show up here, each one a tap from selling.</Text>
          <Button label="Connect wallet" onPress={() => navigation.navigate("Connect", { track: true })} style={styles.emptyButton} />
        </View>
      </ScrollView>
    );
  }

  const b = bag.value;
  const pnl = b ? pnlOf(mine, b.positions) : null;
  const onChain = mine.some((t) => t.signature);
  const nothing = b ? emptyBag(b.totalUsd) : false;
  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      aria-hidden={away}
      refreshControl={<RefreshControl refreshing={bag.status === "loading"} onRefresh={() => void bag.refresh()} tintColor={color.orange} />}
    >
      <View style={styles.head}>
        <Title>Bag</Title>
        {/* Only a tracked wallet needs naming: your own is just your bag. */}
        {wallet.kind === "watch" ? (
          <Pressable onPress={() => navigation.navigate("Me")} style={styles.addrTap} accessibilityRole="button" accessibilityLabel="The wallet you're tracking">
            <Text style={styles.addr}>Tracking {short(wallet.address)}</Text>
          </Pressable>
        ) : null}
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
          <Text style={styles.totalNote}>{bagLine(b.positions.length, b.usdc.usd)}</Text>
          {pnl && pnl.trades > 0 && (
            <Text style={[styles.pnl, { color: pnl.all < 0 ? color.dim : color.green }]}>Your apes: {gain(pnl.all)} all-time</Text>
          )}
          {nothing ? (
            <View style={styles.start}>
              <Text style={styles.startLine}>Add USDC or SOL to start aping. It stays in your own wallet.</Text>
              <Button label="Add cash" onPress={() => navigation.navigate("Deposit")} style={styles.startButton} />
            </View>
          ) : null}

          <Section>Cash</Section>
          <Group>
            <Row left={<Cash glyph="$" />} title="USDC" subtitle="Digital dollars" right={<Value value={usd(b.usdc.usd)} />} />
            <Row left={<Cash glyph="◎" />} title="SOL" subtitle="Pays network fees" right={<Value value={b.sol.usd === null ? "—" : usd(b.sol.usd)} under={`${fmtAmount(b.sol.amount)} SOL`} />} />
            {nothing ? null : (
              <Row left={<Cash glyph="+" tint={color.orange} />} title="Add cash" subtitle="USDC or SOL, on Solana" tint={color.orange} chevron onPress={() => navigation.navigate("Deposit")} />
            )}
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
                    left={<CoinFace uri={p.token.icon} symbol={p.token.symbol} size={size.faceRow} />}
                    title={`$${p.token.symbol}`}
                    subtitle={`${fmtAmount(p.amount)} ${p.token.symbol}`}
                    right={<Value value={usd(p.usd)} under={under} tint={down ? color.dim : color.green} />}
                    onPress={() => navigation.navigate("Coin", { candidate: { token: p.token, via: "link" }, source: null, share: null, others: [], side: "sell" })}
                    label={`$${p.token.symbol}, ${usd(p.usd)}, ${under}. Opens on Sell.`}
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
                {mine.slice(0, allTrades ? 50 : RECENT_TRADES).map((t) => {
                  const what = `${t.side === "buy" ? "Aped" : "Sold"} $${t.symbol}`;
                  return (
                    <Row
                      key={t.id}
                      left={<CoinFace uri={t.icon} symbol={t.symbol} size={size.faceRow} />}
                      title={what}
                      subtitle={tradeLine(t)}
                      right={<Text style={styles.ago}>{ago(t.at)}</Text>}
                      onPress={t.signature ? () => void Linking.openURL(`https://solscan.io/tx/${t.signature}`).catch(() => {}) : undefined}
                      label={`${what}, ${tradeLine(t)}`}
                    />
                  );
                })}
                {!allTrades && mine.length > RECENT_TRADES ? (
                  <Row title={`Show all ${Math.min(mine.length, 50)} trades`} tint={color.orange} chevron onPress={() => setAllTrades(true)} />
                ) : null}
              </Group>
              {onChain && <Text style={styles.hidden}>Tap a trade to see it on Solscan.</Text>}
            </>
          )}
        </>
      ) : null}
    </ScrollView>
  );
}

function Cash({ glyph, tint }: { glyph: string; tint?: string }) {
  return (
    <View style={styles.cash}>
      <Text style={[styles.cashGlyph, tint ? { color: tint } : null]}>{glyph}</Text>
    </View>
  );
}

function Value({ value, under, tint }: { value: string; under?: string; tint?: string }) {
  return (
    <View style={styles.value}>
      <Text style={styles.valueTop}>{value}</Text>
      {under ? <Text style={[styles.valueUnder, tint ? { color: tint } : null]}>{under}</Text> : null}
    </View>
  );
}

/* An empty state's line, kept to a comfortable measure; and how many trades show before "Show all". */
const MEASURE = 320;
const RECENT_TRADES = 5;

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.gutter, paddingTop: space.x3, paddingBottom: space.x12 },
  head: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  addrTap: { minHeight: size.tap, justifyContent: "flex-end", paddingBottom: space.x2 },
  addr: { fontFamily: font.mono, fontSize: type.footnote, color: color.faint },
  empty: { alignItems: "center", marginTop: space.x14, paddingHorizontal: space.x2 },
  emptyTitle: { marginTop: space.x5, textAlign: "center", fontFamily: font.display, fontSize: type.headline, lineHeight: leading.headline, color: color.white },
  emptyLine: { marginTop: space.x3, maxWidth: MEASURE, textAlign: "center", fontFamily: font.body, fontSize: type.body, lineHeight: leading.body, color: color.dim },
  emptyButton: { alignSelf: "stretch", marginTop: space.x7 },
  total: { marginTop: space.x4, fontFamily: font.display, fontSize: type.figure, lineHeight: leading.figure, letterSpacing: tracking.figure, color: color.white },
  totalNote: { marginTop: space.x1, fontFamily: font.bodySemi, fontSize: type.body, color: color.dim },
  pnl: { marginTop: space.x1, fontFamily: font.bodyBold, fontSize: type.body },
  start: { marginTop: space.x6 },
  startLine: { fontFamily: font.body, fontSize: type.callout, lineHeight: leading.callout, color: color.dim },
  startButton: { marginTop: space.x4 },
  ago: { fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  cash: { width: size.faceRow, height: size.faceRow, borderRadius: size.faceRow / 2, backgroundColor: color.ink3, alignItems: "center", justifyContent: "center" },
  cashGlyph: { fontFamily: font.display, fontSize: type.lead, color: color.white },
  value: { alignItems: "flex-end" },
  valueTop: { fontFamily: font.displayBold, fontSize: type.body, color: color.white },
  valueUnder: { marginTop: space.hair, fontFamily: font.bodySemi, fontSize: type.footnote, color: color.faint },
  none: { marginLeft: space.x1, fontFamily: font.body, fontSize: type.body, lineHeight: leading.body, color: color.faint },
  hidden: { marginTop: space.x3, marginLeft: space.x1, fontFamily: font.body, fontSize: type.footnote, color: color.faint },
});
