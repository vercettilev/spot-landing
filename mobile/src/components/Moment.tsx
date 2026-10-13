import * as Sharing from "expo-sharing";
import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Dimensions, Easing, Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import { captureRef } from "react-native-view-shot";
import { momentLines, shareText, type MomentData } from "../logic";
import { color, font } from "../theme";
import { ShareCard } from "./ShareCard";
import { PuppyIcon, feel, tap, thud } from "./ui";

/**
 * THE MOMENT. A trade landed, and the phone says so with its whole screen:
 * orange bursts up from where the button was, the puppy lands with a
 * bounce and barks (rings), the word comes up under it, and the phone
 * thumps in rhythm. A few seconds, or a tap. The colour says the outcome:
 * green for a sell that made money, orange for the rest, never red. An ape
 * or a sell can be shared as a card. Reduced motion gets the same screen
 * without the bounce and the rings. Mounted once, over everything, so a
 * trade that lands while the user is elsewhere still gets it.
 */

export type { MomentData };

const listeners = new Set<(m: MomentData) => void>();

export function celebrate(m: MomentData): void {
  for (const fn of listeners) fn(m);
}

/** Hears every moment as it starts: a sheet waiting on cash closes when the cash lands. */
export function onCelebrate(fn: (m: MomentData) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

const native = Platform.OS !== "web";
const SHOW_MS = { ape: 6_000, sell: 6_000, cash: 2_600 } as const;

/* For looking at the card in a browser: window.__SPOT_QA_CARD = true draws it on screen. */
const cardOnScreen = () => Boolean((globalThis as { __SPOT_QA_CARD?: boolean }).__SPOT_QA_CARD);

export function Moment() {
  const [m, setM] = useState<MomentData | null>(null);
  const [reduced, setReduced] = useState(false);
  const burst = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const pup = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const card = useRef<View>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => setReduced(Boolean(on)))
      .catch(() => {});
    listeners.add(setM);
    return () => {
      listeners.delete(setM);
    };
  }, []);

  useEffect(() => {
    if (!m) return;
    for (const v of [burst, pup, words, ...rings]) v.setValue(0);
    fade.setValue(1);
    /* ba-dum-dum: the success, then two thumps and a tap. */
    feel("success");
    const beats = [setTimeout(thud, 180), setTimeout(tap, 300), setTimeout(thud, 440)];
    const show = reduced
      ? Animated.parallel([
          Animated.timing(burst, { toValue: 1, duration: 120, useNativeDriver: native }),
          Animated.timing(pup, { toValue: 1, duration: 200, useNativeDriver: native }),
          Animated.timing(words, { toValue: 1, duration: 240, useNativeDriver: native }),
        ])
      : Animated.parallel([
          Animated.timing(burst, { toValue: 1, duration: 340, easing: Easing.out(Easing.cubic), useNativeDriver: native }),
          Animated.sequence([Animated.delay(90), Animated.spring(pup, { toValue: 1, friction: 5, tension: 150, useNativeDriver: native })]),
          Animated.sequence([Animated.delay(200), Animated.timing(words, { toValue: 1, duration: 380, easing: Easing.out(Easing.cubic), useNativeDriver: native })]),
          Animated.sequence([
            Animated.delay(260),
            Animated.loop(
              Animated.stagger(
                150,
                rings.map((r) =>
                  Animated.sequence([
                    Animated.timing(r, { toValue: 1, duration: 950, easing: Easing.out(Easing.quad), useNativeDriver: native }),
                    Animated.timing(r, { toValue: 0, duration: 0, useNativeDriver: native }),
                  ]),
                ),
              ),
              { iterations: 2 },
            ),
          ]),
        ]);
    show.start();
    timer.current = setTimeout(dismiss, SHOW_MS[m.kind]);
    return () => {
      beats.forEach(clearTimeout);
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [m]);

  function dismiss() {
    if (timer.current) clearTimeout(timer.current);
    Animated.timing(fade, { toValue: 0, duration: 220, useNativeDriver: native }).start(() => setM(null));
  }

  /* The card as a picture through the phone's share sheet; words where there is no picture. */
  async function share() {
    if (!m || sharing) return;
    if (timer.current) clearTimeout(timer.current);
    setSharing(true);
    tap();
    try {
      if (native && card.current && (await Sharing.isAvailableAsync())) {
        const uri = await captureRef(card, { format: "png", quality: 1 });
        await Sharing.shareAsync(uri, { mimeType: "image/png", dialogTitle: "Share" });
      } else {
        await Share.share({ message: shareText(m) });
      }
    } catch {
      /* cancelled, or nowhere to share to */
    } finally {
      setSharing(false);
      /* Back from the share sheet: a moment more, then it goes. */
      timer.current = setTimeout(dismiss, 3_000);
    }
  }

  if (!m) return null;
  const { width, height } = Dimensions.get("window");
  /* Big enough that the disc, centred where the button was, covers every corner. */
  const d = Math.max(width, height) * 2.3;
  const l = momentLines(m);
  const ground = l.backdrop === "green" ? color.green : color.orange;
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} accessible accessibilityRole="alert" accessibilityLabel={`${l.head} ${l.big}. ${l.small}`}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Close">
        <Animated.View
          style={[styles.burst, { backgroundColor: ground, width: d, height: d, borderRadius: d / 2, left: width / 2 - d / 2, top: height - 80 - d / 2, transform: [{ scale: burst }] }]}
        />
        <View style={styles.center}>
          <View style={styles.stage}>
            {rings.map((r, i) => (
              <Animated.View
                key={i}
                style={[
                  styles.ring,
                  {
                    opacity: r.interpolate({ inputRange: [0, 0.08, 1], outputRange: [0, 0.6, 0] }),
                    transform: [{ scale: r.interpolate({ inputRange: [0, 1], outputRange: [0.8, 2.7] }) }],
                  },
                ]}
              />
            ))}
            <Animated.View
              style={{
                transform: [
                  { scale: pup.interpolate({ inputRange: [0, 1], outputRange: [0.25, 1] }) },
                  { rotate: pup.interpolate({ inputRange: [0, 1], outputRange: ["-16deg", "0deg"] }) },
                ],
              }}
            >
              <PuppyIcon size={140} />
            </Animated.View>
          </View>
          <Animated.View style={[styles.words, { opacity: words, transform: [{ translateY: words.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }] }]}>
            <Text style={styles.head}>{l.head}</Text>
            <Text style={[styles.big, l.backdrop === "green" && styles.bigLoud]}>{l.big}</Text>
            <Text style={styles.small}>{l.small}</Text>
            {m.kind !== "cash" && (
              <Pressable onPress={() => void share()} disabled={sharing} style={({ pressed }) => [styles.share, pressed && styles.sharePressed]} accessibilityRole="button" accessibilityLabel="Share">
                <Text style={styles.shareText}>{sharing ? "Sharing…" : "Share"}</Text>
              </Pressable>
            )}
          </Animated.View>
        </View>
      </Pressable>
      {m.kind !== "cash" && <ShareCard ref={card} data={m} onScreen={cardOnScreen()} />}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 100, elevation: 100 },
  burst: { position: "absolute" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingBottom: 40 },
  stage: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 160, height: 160, borderRadius: 80, borderWidth: 4, borderColor: color.white },
  words: { alignItems: "center", marginTop: 8 },
  head: { fontFamily: font.display, fontSize: 76, lineHeight: 80, letterSpacing: -3, color: color.ink, textAlign: "center" },
  big: { marginTop: 6, fontFamily: font.displayBold, fontSize: 26, lineHeight: 32, color: color.ink, textAlign: "center" },
  bigLoud: { fontSize: 38, lineHeight: 44, letterSpacing: -1 },
  small: { marginTop: 14, maxWidth: 320, fontFamily: font.bodySemi, fontSize: 17, lineHeight: 23, color: color.inkDim, textAlign: "center" },
  share: { marginTop: 28, paddingVertical: 14, paddingHorizontal: 40, borderRadius: 999, backgroundColor: color.ink },
  sharePressed: { opacity: 0.8 },
  shareText: { fontFamily: font.displayBold, fontSize: 18, color: color.white },
});
