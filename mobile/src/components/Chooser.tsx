import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { candidateLine, sameName } from "../logic";
import { color, font, leading, size, space, tracking, type } from "../theme";
import type { Candidate } from "../types";
import { CoinFace, Group, Row, TopBar, Verified } from "./ui";

/**
 * "WHICH ONE?" A share that names two coins, or a cashtag that a dozen
 * launches share, is asked rather than guessed: the wrong coin under a
 * post about the right one is the one mistake Spot must not make. One list,
 * each coin with what tells it apart: its name, its size, its holders.
 */
export function Chooser({
  title,
  line,
  candidates,
  onPick,
  onBack,
}: {
  title: string;
  line: string;
  candidates: Candidate[];
  onPick: (c: Candidate) => void;
  onBack: () => void;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: space.x10 + insets.bottom }]}>
      <TopBar onBack={onBack} />
      <Text style={styles.title} accessibilityRole="header">
        {title}
      </Text>
      <Text style={styles.line}>{line}</Text>
      <Group>
        {candidates.map((c) => (
          <Row
            key={c.token.mint}
            left={<CoinFace uri={c.token.icon} symbol={c.token.symbol} size={size.faceRow} />}
            title={`$${c.token.symbol}`}
            badge={c.token.verified ? <Verified size={size.badge} /> : null}
            subtitle={candidateLine(c.token)}
            lines={2}
            chevron
            onPress={() => onPick(c)}
            label={`$${c.token.symbol}${c.token.verified ? ", verified" : ""}. ${candidateLine(c.token)}`}
          />
        ))}
      </Group>
      {/* Only for namesakes: two different coins in one share are not the same name. */}
      {sameName(candidates) && (
        <Text style={styles.foot}>Same name, different coins. If the post shows the coin's address (CA), pick the one that matches it.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: space.gutter, paddingTop: space.x2 },
  title: { marginTop: space.x2, fontFamily: font.display, fontSize: type.title, lineHeight: leading.title, letterSpacing: tracking.title, color: color.white },
  line: { marginTop: space.x3, marginBottom: space.x6, fontFamily: font.body, fontSize: type.body, lineHeight: leading.body, color: color.dim },
  foot: { marginTop: space.x4, marginHorizontal: space.x1, fontFamily: font.body, fontSize: type.caption, lineHeight: leading.caption, color: color.faint },
});
