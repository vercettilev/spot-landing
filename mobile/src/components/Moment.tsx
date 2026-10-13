import { useEffect, useRef, useState } from "react";
import { AccessibilityInfo, Animated, Dimensions, Easing, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { momentLines, type MomentData } from "../logic";
import { color, font } from "../theme";
import { PuppyIcon, feel, tap, thud } from "./ui";

/**
 * THE MOMENT. A trade landed, and the phone says so with its whole screen:
 * orange bursts up from where the button was, the puppy lands with a
 * bounce and barks (rings), the word comes up under it, and the phone
 * thumps in rhythm. Two seconds, or a tap. Reduced motion gets the same
 * screen without the bounce and the rings. Mounted once, over everything,
 * so a trade that lands while the user is elsewhere still gets it.
 */

export type { MomentData };

const listeners = new Set<(m: MomentData) => void>();

export function celebrate(m: MomentData): void {
  for (const fn of listeners) fn(m);
}

const native = Platform.OS !== "web";
const SHOW_MS = 2400;

export function Moment() {
  const [m, setM] = useState<MomentData | null>(null);
  const [reduced, setReduced] = useState(false);
  const burst = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const pup = useRef(new Animated.Value(0)).current;
  const words = useRef(new Animated.Value(0)).current;
  const rings = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    timer.current = setTimeout(dismiss, SHOW_MS);
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

  if (!m) return null;
  const { width, height } = Dimensions.get("window");
  /* Big enough that the disc, centred where the button was, covers every corner. */
  const d = Math.max(width, height) * 2.3;
  const l = momentLines(m);
  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.wrap, { opacity: fade }]} accessible accessibilityRole="alert" accessibilityLabel={`${l.head} ${l.big}. ${l.small}`}>
      <Pressable style={StyleSheet.absoluteFill} onPress={dismiss} accessibilityLabel="Close">
        <Animated.View
          style={[styles.burst, { width: d, height: d, borderRadius: d / 2, left: width / 2 - d / 2, top: height - 80 - d / 2, transform: [{ scale: burst }] }]}
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
            <Text style={[styles.big, l.tone === "white" && styles.bigWhite]}>{l.big}</Text>
            <Text style={styles.small}>{l.small}</Text>
          </Animated.View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { zIndex: 100, elevation: 100 },
  burst: { position: "absolute", backgroundColor: color.orange },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingBottom: 40 },
  stage: { width: 220, height: 220, alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute", width: 160, height: 160, borderRadius: 80, borderWidth: 4, borderColor: color.white },
  words: { alignItems: "center", marginTop: 8 },
  head: { fontFamily: font.display, fontSize: 76, lineHeight: 80, letterSpacing: -3, color: color.ink, textAlign: "center" },
  big: { marginTop: 6, fontFamily: font.displayBold, fontSize: 26, lineHeight: 32, color: color.ink, textAlign: "center" },
  bigWhite: { fontSize: 38, lineHeight: 44, letterSpacing: -1, color: color.white },
  small: { marginTop: 14, maxWidth: 320, fontFamily: font.bodySemi, fontSize: 17, lineHeight: 23, color: "rgba(0, 0, 0, 0.68)", textAlign: "center" },
});
