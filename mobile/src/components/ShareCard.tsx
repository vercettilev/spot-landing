import { forwardRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SvgXml } from "react-native-svg";
import { WORDMARK_SVG } from "../art";
import { cardLines, fitFigure, type MomentData } from "../logic";
import { color, font, space } from "../theme";
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
  const size = fitFigure(c.figure, CARD.width - 2 * CARD.pad - CARD.slack, CARD.figureMax, CARD.figureTracking);
  return (
    <View ref={ref} collapsable={false} style={[styles.card, onScreen ? styles.onScreen : styles.offScreen]}>
      <View style={styles.top}>
        <PuppyIcon size={CARD.puppy} />
        <SvgXml xml={WORDMARK_SVG} width={CARD.wordmark} height={(CARD.wordmark * 354) / 868} />
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

/* The card is a picture of its own: 4:5, the shape a post is shown at,
   set in its own sizes rather than the phone's. */
const CARD = {
  width: 540,
  height: 675,
  pad: 44,
  /* Room the fitted figure keeps from the edge. */
  slack: 16,
  figureMax: 132,
  figureTracking: -5,
  puppy: 64,
  wordmark: 96,
  gap: 10,
  line: { size: 34, leading: 40, tracking: -0.5 },
  foot: { size: 24, leading: 30 },
  site: 28,
  tag: 20,
};

const styles = StyleSheet.create({
  card: { width: CARD.width, height: CARD.height, padding: CARD.pad, backgroundColor: color.ink, justifyContent: "space-between" },
  offScreen: { position: "absolute", left: -2000, top: 0 },
  onScreen: { position: "absolute", left: 0, top: 0, transform: [{ scale: 0.6 }], transformOrigin: "top left" },
  top: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  middle: { gap: CARD.gap },
  figure: { fontFamily: font.display, letterSpacing: CARD.figureTracking },
  line: { fontFamily: font.displayBold, fontSize: CARD.line.size, lineHeight: CARD.line.leading, letterSpacing: CARD.line.tracking, color: color.white },
  foot: { marginTop: space.x1, fontFamily: font.bodySemi, fontSize: CARD.foot.size, lineHeight: CARD.foot.leading, color: color.dim },
  bottom: { flexDirection: "row", alignItems: "baseline", justifyContent: "space-between" },
  site: { fontFamily: font.displayBold, fontSize: CARD.site, color: color.orange },
  tag: { fontFamily: font.bodySemi, fontSize: CARD.tag, color: color.faint },
});
