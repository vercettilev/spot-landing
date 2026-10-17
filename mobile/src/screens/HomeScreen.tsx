import { useIsFocused } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useState, type ReactNode } from "react";
import { KeyboardAvoidingView, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { errorLine } from "../api";
import { ActionKey, Answer, Breathing, Button, CoinFace, Field, Group, PuppyIcon, Row, Section, Wordmark, tap, useToast } from "../components/ui";
import { useHoldings } from "../holdings";
import { ago, amount as fmtAmount, emptyBag, fromPaste, money, pct, usd, verdictWord } from "../logic";
import type { RootParams } from "../navigation";
import { books, gain, pnlOf, since, sinceLine } from "../pnl";
import { useStore } from "../store";
import { color, font, leading, radius, size, space, tracking, type } from "../theme";
import { short } from "../wallet/base58";

type Props = NativeStackScreenProps<RootParams, "Home">;

/* A coin from spot-core's hand-probed catalog: always found, always sniffable. One, not a choice of three. */
const TRY = "$WIF";

/**
 * HOME, the one screen: what you have, what you can do, what you sniffed.
 * The bag's worth is the loud thing, with what your apes made under it in
 * the colour of the outcome; then three round keys (paste a CA, add cash,
 * cash out), the coins you hold, each one tap from its page opened on Sell,
 * and the coins sniffed lately. Settings, the wallet and every trade sit
 * behind the puppy. The first time, before any of that exists, the screen
 * says what Spot does and shows how: a phone's share menu with Spot in it.
 */
export function HomeScreen({ navigation }: Props) {
  const store = useStore();
  const { wallet, trades } = store;
  const [toastNode, toast] = useToast();
  const [input, setInput] = useState("");
  const insets = useSafeAreaInsets();
  /* Under a sheet, a screen reader stays in the sheet. */
  const focused = useIsFocused();
  const bag = useHoldings(wallet?.address ?? null);
  const recent = store.history.slice(0, 8);
  const first = recent.length === 0 && !wallet;
  const share = fromPaste(input);

  /* A typed CA goes as typed; otherwise the clipboard's, when it holds one. */
  async function paste() {
    if (share) {
      navigation.navigate("Resolve", { share });
      return;
    }
    const text = (await Clipboard.getStringAsync().catch(() => "")).trim();
    const pasted = fromPaste(text);
    if (!pasted) {
      toast("Nothing to paste. Copy a CA, link or $ticker first.");
      return;
    }
    navigation.navigate("Resolve", { share: pasted });
  }

  const header = (
    <View style={styles.header}>
      <Wordmark width={size.wordmark} />
      <Pressable
        onPress={() => {
          tap();
          navigation.navigate("Settings");
        }}
        hitSlop={space.x1}
        style={({ pressed }) => pressed && styles.pressed}
        accessibilityRole="button"
        accessibilityLabel="Settings, your wallet and trades"
      >
        <PuppyIcon size={size.markHeader} />
      </Pressable>
    </View>
  );

  if (first) {
    return (
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined} aria-hidden={!focused}>
        <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.x10 + insets.bottom }]} keyboardShouldPersistTaps="handled">
          {header}
          <Text style={styles.hero} accessibilityRole="header">
            Ape from{"\n"}any app.
          </Text>
          <Text style={styles.lede}>Spot checks every coin for scams before you buy, so you can always sell it back.</Text>
          <ShareSheet />
          <Field
            value={input}
            onChangeText={setInput}
            placeholder="Or paste a link or $ticker"
            returnKeyType="go"
            onSubmitEditing={() => void paste()}
            style={styles.inputFirst}
            accessibilityLabel="CA, ticker or link"
          />
          <Button label={share ? "Sniff it" : "Paste & sniff"} kind="go" onPress={() => void paste()} style={styles.go} />
          <Text style={styles.foot}>Free. No wallet needed.</Text>
          <Pressable
            onPress={() => {
              tap();
              navigation.navigate("Resolve", { share: { text: TRY, from: "paste" } });
            }}
            hitSlop={{ top: space.hair, bottom: space.hair }}
            style={({ pressed }) => [styles.try, pressed && styles.tryPressed]}
            accessibilityRole="button"
            accessibilityLabel={`Try it on ${TRY}`}
          >
            <Text style={styles.tryText}>Try it on {TRY}</Text>
          </Pressable>
        </ScrollView>
        {toastNode}
      </KeyboardAvoidingView>
    );
  }

  const b = bag.value;
  const mine = wallet ? trades.filter((t) => t.owner === wallet.address) : [];
  const ledger = books(mine);
  const pnl = b ? pnlOf(mine, b.positions) : null;
  const nothing = b ? emptyBag(b.totalUsd) : false;
  const trading = wallet?.kind === "mwa";

  return (
    <View style={styles.fill} aria-hidden={!focused}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: space.x10 + insets.bottom }]}
        refreshControl={wallet ? <RefreshControl refreshing={bag.status === "loading"} onRefresh={() => void bag.refresh()} tintColor={color.orange} /> : undefined}
      >
        {header}

        {wallet ? (
          bag.status === "loading" && !b ? (
            <Breathing>
              <Text style={styles.total}>$…</Text>
              <Text style={styles.totalNote}>Counting your bag…</Text>
            </Breathing>
          ) : bag.status === "error" && !b ? (
            <View style={styles.trouble}>
              <Text style={styles.troubleTitle}>Couldn't load your bag.</Text>
              <Text style={styles.totalNote}>{bag.error ? errorLine(bag.error) : "Pull down to try again."}</Text>
              <Button label="Try again" kind="quiet" onPress={() => void bag.refresh()} style={styles.troubleKey} />
            </View>
          ) : b ? (
            <>
              <Text style={styles.total} numberOfLines={1} adjustsFontSizeToFit>
                {money(b.totalUsd)}
              </Text>
              {/* Only a tracked wallet needs naming: your own is just your bag. */}
              {wallet.kind === "watch" ? (
                <Text style={styles.totalNote}>Tracking {short(wallet.address)}</Text>
              ) : pnl && pnl.trades > 0 ? (
                <Text style={[styles.pnl, { color: pnl.all < 0 ? color.dim : color.green }]}>{gain(pnl.all)} all-time</Text>
              ) : null}
            </>
          ) : null
        ) : null}

        {/* Paste is the loud key, until an empty wallet's next step is cash. */}
        <View style={styles.actions}>
          <ActionKey glyph="paste" label="Paste CA" loud={!(trading && nothing)} onPress={() => void paste()} />
          {trading ? (
            <>
              <ActionKey glyph="plus" label="Add cash" loud={nothing} onPress={() => navigation.navigate("Deposit")} />
              {b && b.usdc.usd >= 1 ? <ActionKey glyph="out" label="Cash out" onPress={() => navigation.navigate("CashOut")} /> : null}
            </>
          ) : (
            <ActionKey glyph="wallet" label="Connect" onPress={() => navigation.navigate("Connect", { track: !wallet })} />
          )}
        </View>

        {b ? (
          <>
            <Section>Your coins</Section>
            <Group>
              <Row left={<Cash glyph="$" />} title="Cash" subtitle="Ready to ape" right={<Value value={usd(b.usdc.usd)} />} />
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
              {/* SOL is in the total, so it is in the list: the rows add up to the number over them. */}
              {b.sol.amount > 0 ? (
                <Row
                  left={<Cash glyph="◎" />}
                  title="SOL"
                  subtitle="For network fees"
                  right={<Value value={b.sol.usd === null ? "—" : usd(b.sol.usd)} under={`${fmtAmount(b.sol.amount)} SOL`} />}
                />
              ) : null}
            </Group>
            {b.hidden > 0 && <Text style={styles.small}>Plus {b.hidden} tiny coin{b.hidden === 1 ? "" : "s"}, too small to show.</Text>}
          </>
        ) : null}

        {recent.length > 0 ? (
          <>
            <Section>Sniffed lately</Section>
            <Group>
              {recent.map((h) => {
                const v = verdictWord(h.level);
                return (
                  <Row
                    key={h.mint}
                    left={<CoinFace uri={h.token.icon} symbol={h.token.symbol} size={size.faceRow} />}
                    title={`$${h.token.symbol}`}
                    subtitle={h.token.name}
                    right={
                      <View style={styles.recentRight}>
                        <Text style={styles.ago}>{ago(h.at)}</Text>
                        <Answer status={v.status}>{v.word}</Answer>
                      </View>
                    }
                    onPress={() => navigation.navigate("Coin", { candidate: { token: h.token, via: "link" }, source: null, share: null, others: [] })}
                    label={`$${h.token.symbol}, ${v.word}, ${ago(h.at)}`}
                  />
                );
              })}
            </Group>
          </>
        ) : null}

        <View style={styles.hint} accessible accessibilityLabel="On any post, tap Share, then Spot. No Spot? Tap Share via, or More, first.">
          <PuppyIcon size={size.mark} />
          <View style={styles.hintWords}>
            <Text style={styles.hintText}>On any post: tap Share, then Spot.</Text>
            <Text style={styles.hintMore}>{NOT_THERE}</Text>
          </View>
        </View>
      </ScrollView>
      {toastNode}
    </View>
  );
}

function Cash({ glyph }: { glyph: ReactNode }) {
  return (
    <View style={styles.cash}>
      <Text style={styles.cashGlyph}>{glyph}</Text>
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

/* How Spot is used, drawn instead of written: a phone's share menu with
   Spot lit up in it. The other tiles are generic on purpose. */
const TILES = [
  { label: "Copy link", d: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" },
  { label: "Spot", d: null },
  { label: "Messages", d: "M5 6.5h14v9H9l-4 3v-12z" },
  { label: "More", d: "M6 12h.01M12 12h.01M18 12h.01" },
];

/* Many apps open a menu of their own first, with the phone's share menu
   behind one button: X's Share via…, More in others. Spot is in the phone's.
   There, Android puts the apps used most up front, and a held app can be
   pinned there; iPhone has no Pin. */
const NOT_THERE = "No Spot? Tap Share via… or More first.";
const PIN = Platform.OS === "ios" ? null : "Hold Spot and tap Pin to keep it up front.";

/* The drawing's own geometry: a share menu's tiles, and the lede's measure. */
const TILE = 56;
const MEASURE = 340;

function ShareSheet() {
  return (
    <View style={sheet.wrap}>
      <View style={sheet.panel} accessible accessibilityLabel="On any post, tap Share, then Spot">
        <View style={sheet.handle} />
        <Text style={sheet.title}>Share</Text>
        <View style={sheet.tiles}>
          {TILES.map((t) => (
            <View key={t.label} style={sheet.tile}>
              {t.d ? (
                <View style={sheet.icon}>
                  <Svg width={size.icon} height={size.icon} viewBox="0 0 24 24" fill="none" stroke={color.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d={t.d} />
                  </Svg>
                </View>
              ) : (
                <View style={sheet.spot}>
                  <PuppyIcon size={TILE - space.x1} />
                </View>
              )}
              <Text style={[sheet.label, !t.d && sheet.labelOn]}>{t.label}</Text>
            </View>
          ))}
        </View>
      </View>
      <Text style={sheet.caption}>On any post: tap Share, then Spot.</Text>
      <Text style={sheet.more}>{PIN ? `${NOT_THERE} ${PIN}` : NOT_THERE}</Text>
    </View>
  );
}

const sheet = StyleSheet.create({
  wrap: { marginTop: space.x7 },
  panel: { paddingTop: space.x3, paddingBottom: space.x5, paddingHorizontal: space.x3, borderRadius: radius.block, backgroundColor: color.ink2 },
  handle: { alignSelf: "center", width: size.grabber, height: space.x1, borderRadius: radius.pill, backgroundColor: color.ink3 },
  title: { marginTop: space.x3, marginLeft: space.x2, fontFamily: font.bodyBold, fontSize: type.body, color: color.dim },
  tiles: { flexDirection: "row", justifyContent: "space-around", marginTop: space.x4 },
  tile: { alignItems: "center", width: TILE + space.x5 },
  icon: { width: TILE, height: TILE, borderRadius: radius.key, backgroundColor: color.ink3, alignItems: "center", justifyContent: "center" },
  spot: { width: TILE, height: TILE, borderRadius: radius.key, alignItems: "center", justifyContent: "center", boxShadow: `0px 0px 0px 3px ${color.ink2}, 0px 0px 0px 5px ${color.orange}` },
  label: { marginTop: space.x2, fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  labelOn: { fontFamily: font.bodyBold, color: color.white },
  caption: { marginTop: space.x3, marginLeft: space.x1, fontFamily: font.bodySemi, fontSize: type.caption, color: color.dim },
  more: { marginTop: space.x1, marginLeft: space.x1, fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: size.row },
  pressed: { opacity: 0.72 },
  hero: { marginTop: space.x4, fontFamily: font.display, fontSize: type.hero, lineHeight: leading.hero, letterSpacing: tracking.hero, color: color.white },
  lede: { marginTop: space.x3, maxWidth: MEASURE, fontFamily: font.body, fontSize: type.lead, lineHeight: leading.lead, color: color.dim },
  inputFirst: { marginTop: space.x7 },
  go: { marginTop: space.x3 },
  foot: { marginTop: space.x3, textAlign: "center", fontFamily: font.bodySemi, fontSize: type.caption, color: color.faint },
  try: { alignSelf: "center", marginTop: space.x6, minHeight: size.chip, justifyContent: "center", paddingHorizontal: space.x4, borderRadius: radius.pill, backgroundColor: color.ink2 },
  tryPressed: { backgroundColor: color.ink3 },
  tryText: { fontFamily: font.displayBold, fontSize: type.body, color: color.white },
  total: { marginTop: space.x2, fontFamily: font.display, fontSize: type.figure, lineHeight: leading.figure, letterSpacing: tracking.figure, color: color.white },
  totalNote: { marginTop: space.x1, fontFamily: font.bodySemi, fontSize: type.body, color: color.dim },
  pnl: { marginTop: space.x1, fontFamily: font.bodyBold, fontSize: type.body },
  trouble: { marginTop: space.x4 },
  troubleTitle: { fontFamily: font.display, fontSize: type.headline, lineHeight: leading.headline, color: color.white },
  troubleKey: { marginTop: space.x4 },
  actions: { flexDirection: "row", justifyContent: "space-around", marginTop: space.x6 },
  cash: { width: size.faceRow, height: size.faceRow, borderRadius: size.faceRow / 2, backgroundColor: color.ink3, alignItems: "center", justifyContent: "center" },
  cashGlyph: { fontFamily: font.display, fontSize: type.lead, color: color.white },
  value: { alignItems: "flex-end" },
  valueTop: { fontFamily: font.displayBold, fontSize: type.body, color: color.white },
  valueUnder: { marginTop: space.hair, fontFamily: font.bodySemi, fontSize: type.footnote, color: color.faint },
  small: { marginTop: space.x3, marginLeft: space.x1, fontFamily: font.body, fontSize: type.footnote, color: color.faint },
  recentRight: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  ago: { fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  hint: { flexDirection: "row", alignItems: "center", gap: space.x3, marginTop: space.x8, paddingHorizontal: space.x1 },
  hintWords: { flex: 1 },
  hintText: { fontFamily: font.bodySemi, fontSize: type.caption, color: color.dim },
  hintMore: { marginTop: space.hair, fontFamily: font.body, fontSize: type.footnote, lineHeight: leading.footnote, color: color.faint },
});
