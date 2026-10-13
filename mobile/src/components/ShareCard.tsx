import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { WORDMARK_SVG } from "../art";
import { cardLines, fitFigure, type MomentData } from "../logic";
import { color, font } from "../theme";
import { PuppyIcon } from "./ui";

/**
 * THE CARD PEOPLE POST: black, one big figure in the colour of the
 * outcome, the line under it, the puppy and the wordmark. Drawn off the
 * screen at 4:5 and snapped into a picture when Share is tapped. Spot's
 * name and address are on it, which is the point.
 */
export const ShareCard = forwardRef<View, { data: MomentData; onScreen?: boolean }>(function ShareCard({ data, onScreen }, ref) {
  const c = cardLines(data);
  const tint = c.tint === "green" ? color.green : color.orange;
  const size = fitFigure(c.figure, WIDTH - 2 * PAD - 16);
  return (
    <View ref={ref} collapsable={false} style={[styles.card, onScreen ? styles.onScreen : styles.offScreen]}>
      <View style={styles.top}>
        <PuppyIcon size={64} />
        <SvgXml xml={WORDMARK_SVG} width={96} height={(96 * 354) / 868} />
      </View>
      <View style={styles.middle}>
        <Text style={[styles.figure, { color: tint, fontSize: size, lineHeight: Math.round(size * 1.04) }]} numberOfLines={1}>
          {c.figure}
        </Text>
        <Text style={styles.line}>{c.line}</Text>
        {c.foot ? <Text style={styles.foot}>{c.foot}</Text> : null}
      </View>
      <View style={styles.bottom}>
        <Text style={styles.site}>usespot.fun</Text>
        <Text style={styles.tag}>Ape from any app.</Text>
      </View>
    </View>
  );
});

/* 4:5, the shape a post is shown at. */
const WIDTH = 540;
const PAD = 44;

const styles = StyleSheet.create({
  card: { width: WIDTH, height: 675, padding: PAD, backgroundColor: "#000000", justifyContent: "space-between" },
  offScreen: { position: "absolute", left: -2000, top: 0 },
  onScreen: { position: "absolute", left: 0, top: 0, transform: [{ scale: 0.6 }], transformOrigin: "top left" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  middle: { gap: 10 },
  figure: { fontFamily: font.display, letterSpacing: -5 },
  line: { fontFamily: font.displayBold, fontSize: 34, lineHeight: 40, letterSpacing: -0.5, color: color.white },
  foot: { marginTop: 4, fontFamily: font.bodySemi, fontSize: 24, lineHeight: 30, color: color.dim },
  bottom: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  site: { fontFamily: font.displayBold, fontSize: 28, color: color.orange },
  tag: { fontFamily: font.bodySemi, fontSize: 20, color: color.faint },
});
