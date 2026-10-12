import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Answer, Button, CoinFace, Group, PuppyIcon, Row, Section, Wordmark, tap, useToast } from "../components/ui";
import { ago, fromPaste, verdictWord } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { useStore } from "../store";
import { color, font, space, type } from "../theme";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Sniff">, NativeStackScreenProps<RootParams>>;

/* Coins from spot-core's hand-probed catalog: always found, always sniffable. */
const TRIES = ["$WIF", "$POPCAT", "$JUP"];

/**
 * THE FRONT DOOR. What you get, in the landing's words: ape anything you
 * see, and nothing that can't be sold. Then how, shown rather than listed:
 * a phone's share menu with Spot in it. One field and one button for posts
 * without a Share button, and the coins sniffed lately, one tap from their
 * sniff again.
 */
export function SniffScreen({ navigation }: Props) {
  const store = useStore();
  const [toastNode, toast] = useToast();
  const [input, setInput] = useState("");
  const share = fromPaste(input);
  const recent = store.history.slice(0, 8);

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

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Wordmark width={84} />
          <PuppyIcon size={40} />
        </View>

        <Text style={styles.hero}>Ape from{"\n"}any app.</Text>
        <Text style={styles.lede}>Spot sniffs every coin before you buy. Honeypots never make it into your bag.</Text>

        <ShareSheet />

        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Or paste a CA, $ticker or link"
          placeholderTextColor="#8e8a82"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="go"
          onSubmitEditing={() => void go()}
          style={styles.input}
          accessibilityLabel="CA, ticker or link"
        />
        <Button label={share ? "Sniff it" : "Paste & sniff"} kind="go" onPress={() => void go()} style={styles.go} />
        <Text style={styles.foot}>Free. No wallet needed.</Text>

        {recent.length > 0 ? (
          <>
            <Section>Sniffed lately</Section>
            <Group>
              {recent.map((h) => {
                const v = verdictWord(h.level);
                return (
                  <Row
                    key={h.mint}
                    left={<CoinFace uri={h.token.icon} symbol={h.token.symbol} size={40} />}
                    title={`$${h.token.symbol}`}
                    subtitle={h.headline}
                    right={
                      <View style={styles.recentRight}>
                        <Text style={styles.ago}>{ago(h.at)}</Text>
                        <Answer status={v.status}>{v.word}</Answer>
                      </View>
                    }
                    onPress={() => navigation.navigate("Coin", { candidate: { token: h.token, via: "link" }, source: null, share: null, others: [] })}
                  />
                );
              })}
            </Group>
          </>
        ) : (
          <>
            <Section>Try one</Section>
            <View style={styles.tries}>
              {TRIES.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => {
                    tap();
                    navigation.navigate("Resolve", { share: { text: t, from: "paste" } });
                  }}
                  style={({ pressed }) => [styles.try, pressed && styles.tryPressed]}
                  accessibilityRole="button"
                >
                  <Text style={styles.tryText}>{t}</Text>
                </Pressable>
              ))}
            </View>
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
                  <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={color.faint} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <Path d={t.d} />
                  </Svg>
                </View>
              ) : (
                <View style={sheet.spot}>
                  <PuppyIcon size={52} />
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
  wrap: { marginTop: 28 },
  panel: { paddingTop: 10, paddingBottom: 18, paddingHorizontal: 12, borderRadius: 24, backgroundColor: color.ink2 },
  handle: { alignSelf: "center", width: 36, height: 4, borderRadius: 2, backgroundColor: color.ink3 },
  title: { marginTop: 12, marginLeft: 8, fontFamily: font.bodyBold, fontSize: type.body, color: color.dim },
  tiles: { flexDirection: "row", justifyContent: "space-around", marginTop: 14 },
  tile: { alignItems: "center", width: 74 },
  icon: { width: 56, height: 56, borderRadius: 16, backgroundColor: color.ink3, alignItems: "center", justifyContent: "center" },
  spot: { width: 56, height: 56, borderRadius: 16, alignItems: "center", justifyContent: "center", boxShadow: `0px 0px 0px 3px ${color.ink2}, 0px 0px 0px 5px ${color.orange}` },
  label: { marginTop: 8, fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  labelOn: { fontFamily: font.bodyBold, color: color.white },
  caption: { marginTop: 12, marginLeft: 4, fontFamily: font.bodySemi, fontSize: type.caption, color: color.dim },
});

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: space.gutter, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 64 },
  hero: { marginTop: 16, fontFamily: font.display, fontSize: type.hero, lineHeight: 52, letterSpacing: -1.8, color: color.white },
  lede: { marginTop: 14, maxWidth: 340, fontFamily: font.body, fontSize: type.lead, lineHeight: 25, color: color.dim },
  input: {
    marginTop: 28,
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 16,
    backgroundColor: color.white,
    fontFamily: font.bodySemi,
    fontSize: 17,
    color: color.ink,
  },
  go: { marginTop: 12 },
  foot: { marginTop: 12, textAlign: "center", fontFamily: font.bodySemi, fontSize: type.caption, color: color.faint },
  recentRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  ago: { fontFamily: font.bodySemi, fontSize: type.micro, color: color.faint },
  tries: { flexDirection: "row", gap: 10 },
  try: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, backgroundColor: color.ink2 },
  tryPressed: { backgroundColor: color.ink3 },
  tryText: { fontFamily: font.displayBold, fontSize: 16, color: color.white },
});
