import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { useIsFocused, type CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Answer, Button, Chevron, CoinFace, Field, Group, PuppyIcon, Row, Section, Wordmark, tap, useToast } from "../components/ui";
import { useHoldings } from "../holdings";
import { ago, fromPaste, money, verdictHead, verdictWord } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { useStore } from "../store";
import { color, font, leading, radius, size, space, tracking, type } from "../theme";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Sniff">, NativeStackScreenProps<RootParams>>;

/* Coins from spot-core's hand-probed catalog: always found, always sniffable. */
const TRIES = ["$WIF", "$POPCAT", "$JUP"];

/**
 * THE FRONT DOOR. The first time: what you get, in the landing's words
 * (ape anything you see, and nothing that can't be sold), then how, shown
 * rather than listed: a phone's share menu with Spot in it, and a coin to
 * try. After that the promise has been kept, so the screen gets out of the
 * way: what the bag holds, one field and one key for posts without a
 * Share button, and the coins sniffed lately, one tap from their sniff.
 */
export function SniffScreen({ navigation }: Props) {
  const store = useStore();
  const [toastNode, toast] = useToast();
  const [input, setInput] = useState("");
  const share = fromPaste(input);
  const recent = store.history.slice(0, 8);
  const first = recent.length === 0;
  const trading = store.wallet?.kind === "mwa" ? store.wallet.address : null;
  const bag = useHoldings(trading);
  const focused = useIsFocused();

  async function go() {
    if (share) {
      navigation.navigate("Resolve", { share });
      return;
    }
    const text = (await Clipboard.getStringAsync().catch(() => "")).trim();
    const pasted = fromPaste(text);
    if (!pasted) {
      toast("Nothing to paste. Copy a CA, $ticker or link first.");
      return;
    }
    setInput(text);
    navigation.navigate("Resolve", { share: pasted });
  }

  const paste = (
    <>
      <Field
        value={input}
        onChangeText={setInput}
        placeholder={first ? "Or paste a CA, $ticker or link" : "Paste a CA, $ticker or link"}
        returnKeyType="go"
        onSubmitEditing={() => void go()}
        style={first ? styles.inputFirst : styles.input}
        accessibilityLabel="CA, ticker or link"
      />
      <Button label={share ? "Sniff it" : "Paste & sniff"} kind="go" onPress={() => void go()} style={styles.go} />
    </>
  );

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined} aria-hidden={!focused}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Wordmark width={size.wordmark} />
          {trading ? (
            <Pressable
              onPress={() => {
                tap();
                navigation.navigate("Bag");
              }}
              style={({ pressed }) => [styles.cash, pressed && styles.cashPressed]}
              accessibilityRole="button"
              accessibilityLabel={bag.value ? `Your bag: ${money(bag.value.totalUsd)}. Open it.` : "Open your bag"}
            >
              {/* What you have, all told: "$0.00 to ape" right after an ape read as money gone. */}
              <Text style={styles.cashText}>{bag.value ? money(bag.value.totalUsd) : "$…"}</Text>
              <Text style={styles.cashLabel}>in your bag</Text>
              <Chevron tint={color.faint} />
            </Pressable>
          ) : (
            <PuppyIcon size={size.markHeader} />
          )}
        </View>

        {first ? (
          <>
            <Text style={styles.hero} accessibilityRole="header">
              Ape from{"\n"}any app.
            </Text>
            <Text style={styles.lede}>Spot sniffs every coin before you buy. Honeypots never make it into your bag.</Text>
            <ShareSheet />
            {paste}
            <Text style={styles.foot}>Free. No wallet needed.</Text>
            <Section>Try one</Section>
            <View style={styles.tries}>
              {TRIES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    tap();
                    navigation.navigate("Resolve", { share: { text: t, from: "paste" } });
                  }}
                  hitSlop={{ top: space.hair, bottom: space.hair }}
                  style={({ pressed }) => [styles.try, pressed && styles.tryPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={`Try ${t}`}
                >
                  <Text style={styles.tryText}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : (
          <>
            {paste}
            <View style={styles.hint} accessible accessibilityLabel="On any post, tap Share, then Spot">
              <PuppyIcon size={size.mark} />
              <Text style={styles.hintText}>On any post: tap Share, then Spot.</Text>
            </View>
            <Section>Sniffed lately</Section>
            <Group>
              {recent.map((h) => {
                const v = verdictWord(h.level);
                return (
                  <Row
                    key={h.mint}
                    left={<CoinFace uri={h.token.icon} symbol={h.token.symbol} size={size.faceRow} />}
                    title={`$${h.token.symbol}`}
                    subtitle={verdictHead(h.level, h.headline)}
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
        )}
      </ScrollView>
      {toastNode}
    </KeyboardAvoidingView>
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
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: space.x10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: size.row },
  cash: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.x1,
    minHeight: size.tap,
    paddingLeft: space.x4,
    paddingRight: space.x2,
    borderRadius: radius.pill,
    backgroundColor: color.ink2,
    marginRight: -space.x1,
  },
  cashPressed: { backgroundColor: color.ink3 },
  cashText: { fontFamily: font.displayBold, fontSize: type.body, color: color.white },
  cashLabel: { fontFamily: font.bodySemi, fontSize: type.footnote, color: color.faint },
  hero: { marginTop: space.x4, fontFamily: font.display, fontSize: type.hero, lineHeight: leading.hero, letterSpacing: tracking.hero, color: color.white },
  lede: { marginTop: space.x3, maxWidth: MEASURE, fontFamily: font.body, fontSize: type.lead, lineHeight: leading.lead, color: color.dim },
  inputFirst: { marginTop: space.x7 },
  input: { marginTop: space.x2 },
  go: { marginTop: space.x3 },
  foot: { marginTop: space.x3, textAlign: "center", fontFamily: font.bodySemi, fontSize: type.caption, color: color.faint },
  hint: { flexDirection: "row", alignItems: "center", gap: space.x3, marginTop: space.x4, paddingHorizontal: space.x1 },
  hintText: { flex: 1, fontFamily: font.bodySemi, fontSize: type.caption, color: color.dim },
  recentRight: { flexDirection: "row", alignItems: "center", gap: space.x2 },
  ago: { fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  tries: { flexDirection: "row", gap: space.x2 },
  try: { minHeight: size.chip, justifyContent: "center", paddingHorizontal: space.x4, borderRadius: radius.pill, backgroundColor: color.ink2 },
  tryPressed: { backgroundColor: color.ink3 },
  tryText: { fontFamily: font.displayBold, fontSize: type.body, color: color.white },
});
