import { StyleSheet, Text, View } from "react-native";
import { color, font, leading, size, space, tracking, type } from "../theme";
import { Breathing, Button, IconButton, PuppyIcon } from "./ui";

/**
 * The puppy, a line and at most two ways on: finding nothing, or failing to
 * ask. Always a way back at the top, as every other screen has, and a note
 * under the keys for what a key could not do ("Nothing to paste").
 */
export function Status({
  title,
  line,
  busy,
  primary,
  secondary,
  onBack,
  note,
}: {
  title: string;
  line?: string | null;
  busy?: boolean;
  primary?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
  onBack?: () => void;
  note?: string | null;
}) {
  const puppy = <PuppyIcon size={size.puppy} />;
  return (
    <View style={styles.fill}>
      {onBack ? (
        <View style={styles.top}>
          <IconButton icon="back" label="Back" onPress={onBack} style={styles.back} />
        </View>
      ) : null}
      <View style={styles.wrap}>
        {busy ? <Breathing>{puppy}</Breathing> : puppy}
        <Text style={styles.title} accessibilityRole="header">
          {title}
        </Text>
        {line ? (
          <Text style={styles.line} numberOfLines={3}>
            {line}
          </Text>
        ) : null}
        <View style={styles.actions}>
          {primary && <Button label={primary.label} onPress={primary.onPress} />}
          {secondary && <Button label={secondary.label} kind="quiet" onPress={secondary.onPress} />}
        </View>
        {note ? (
          <Text style={styles.note} accessibilityLiveRegion="polite">
            {note}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  top: { flexDirection: "row", alignItems: "center", height: size.tap, paddingHorizontal: space.gutter, marginTop: space.x2 },
  back: { marginLeft: -space.x3 },
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: space.x7, paddingBottom: space.x10 },
  title: { marginTop: space.x6, textAlign: "center", fontFamily: font.display, fontSize: type.display, lineHeight: leading.display, letterSpacing: tracking.display, color: color.white },
  line: { marginTop: space.x3, textAlign: "center", fontFamily: font.body, fontSize: type.body, lineHeight: leading.body, color: color.dim },
  actions: { alignSelf: "stretch", gap: space.x2, marginTop: space.x8 },
  note: { marginTop: space.x4, textAlign: "center", fontFamily: font.bodySemi, fontSize: type.caption, lineHeight: leading.caption, color: color.caution },
});
