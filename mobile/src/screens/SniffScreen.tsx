import type { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import type { CompositeScreenProps } from "@react-navigation/native";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Answer, Button, CoinFace, PuppyIcon, Section, Wordmark, tap, useToast } from "../components/ui";
import { ago, fromPaste, verdictWord } from "../logic";
import type { RootParams, TabParams } from "../navigation";
import { useStore } from "../store";
import { color, font } from "../theme";

type Props = CompositeScreenProps<BottomTabScreenProps<TabParams, "Sniff">, NativeStackScreenProps<RootParams>>;

/* Coins from spot-core's hand-probed catalog: always found, always sniffable. */
const TRIES = ["$WIF", "$POPCAT", "$JUP"];

const STEPS = [
  { n: "1", title: "Share", line: "any post with a coin" },
  { n: "2", title: "Pick Spot", line: "from the list" },
  { n: "3", title: "Sniffed", line: "scam or not, in seconds" },
];

/**
 * THE FRONT DOOR. What Spot is, in the landing's words; one field and one
 * button for a CA, a $ticker or a link (empty, the button pastes and
 * sniffs in one tap); and the coins sniffed lately, one tap from their
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

        <Text style={styles.h1}>Ape from{"\n"}any app.</Text>
        <Text style={styles.lede}>See a coin in a post? Share it to Spot. It sniffs out scams before you ape.</Text>

        <View style={styles.steps}>
          {STEPS.map((s) => (
            <View key={s.n} style={styles.step}>
              <Text style={styles.stepN}>{s.n}</Text>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepLine}>{s.line}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.label}>Or paste it here</Text>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="A CA, $ticker or link"
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
            {recent.map((h) => {
              const v = verdictWord(h.level);
              return (
                <Pressable
                  key={h.mint}
                  onPress={() => {
                    tap();
                    navigation.navigate("Coin", { candidate: { token: h.token, via: "link" }, source: null, share: null, others: [] });
                  }}
                  style={({ pressed }) => [styles.recent, pressed && styles.recentPressed]}
                  accessibilityRole="button"
                >
                  <CoinFace uri={h.token.icon} symbol={h.token.symbol} size={38} />
                  <View style={styles.recentText}>
                    <Text style={styles.recentSymbol} numberOfLines={1}>
                      ${h.token.symbol}
                    </Text>
                    <Text style={styles.recentLine} numberOfLines={1}>
                      {h.headline}
                    </Text>
                  </View>
                  <Text style={styles.recentAgo}>{ago(h.at)}</Text>
                  <Answer status={v.status}>{v.word}</Answer>
                </Pressable>
              );
            })}
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
                  style={({ pressed }) => [styles.try, pressed && styles.recentPressed]}
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

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", height: 64 },
  h1: { marginTop: 18, fontFamily: font.display, fontSize: 54, lineHeight: 52, letterSpacing: -1.8, color: color.white },
  lede: { marginTop: 16, fontFamily: font.body, fontSize: 18, lineHeight: 25, color: "#cfcac1" },
  steps: { flexDirection: "row", gap: 10, marginTop: 28 },
  step: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: color.ink2, borderWidth: 1, borderColor: color.line },
  stepN: { fontFamily: font.display, fontSize: 22, color: color.orange },
  stepTitle: { marginTop: 6, fontFamily: font.bodyBold, fontSize: 15.5, color: color.white },
  stepLine: { marginTop: 2, fontFamily: font.body, fontSize: 13, lineHeight: 17, color: color.faint },
  label: { marginTop: 34, fontFamily: font.bodyBold, fontSize: 16, color: color.white },
  input: {
    marginTop: 10,
    height: 58,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: color.white,
    fontFamily: font.bodySemi,
    fontSize: 17,
    color: color.ink,
  },
  go: { marginTop: 12 },
  foot: { marginTop: 14, textAlign: "center", fontFamily: font.bodySemi, fontSize: 14, color: color.faint },
  recent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
    borderRadius: 16,
    backgroundColor: color.ink2,
    borderWidth: 1,
    borderColor: color.line,
  },
  recentPressed: { backgroundColor: color.ink3 },
  recentText: { flex: 1, minWidth: 0 },
  recentSymbol: { fontFamily: font.displayBold, fontSize: 17, color: color.white },
  recentLine: { marginTop: 1, fontFamily: font.body, fontSize: 13, color: color.faint },
  recentAgo: { fontFamily: font.mono, fontSize: 12, color: color.faint },
  tries: { flexDirection: "row", gap: 10 },
  try: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: color.line, backgroundColor: color.ink2 },
  tryText: { fontFamily: font.displayBold, fontSize: 16, color: color.white },
});
