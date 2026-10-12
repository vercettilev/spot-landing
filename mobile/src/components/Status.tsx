import { StyleSheet, Text, View } from "react-native";
import { color, font } from "../theme";
import { Breathing, Button, PuppyIcon } from "./ui";

/** The puppy, a line and at most two ways on: reading a share, finding nothing, or failing to ask. */
export function Status({
  title,
  line,
  busy,
  primary,
  secondary,
}: {
  title: string;
  line?: string | null;
  busy?: boolean;
  primary?: { label: string; onPress: () => void };
  secondary?: { label: string; onPress: () => void };
}) {
  const puppy = <PuppyIcon size={112} />;
  return (
    <View style={styles.wrap}>
      {busy ? <Breathing>{puppy}</Breathing> : puppy}
      <Text style={styles.title}>{title}</Text>
      {line ? (
        <Text style={styles.line} numberOfLines={3}>
          {line}
        </Text>
      ) : null}
      <View style={styles.actions}>
        {primary && <Button label={primary.label} onPress={primary.onPress} />}
        {secondary && <Button label={secondary.label} kind="quiet" onPress={secondary.onPress} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28, paddingBottom: 40 },
  title: { marginTop: 26, textAlign: "center", fontFamily: font.display, fontSize: 32, lineHeight: 34, letterSpacing: -0.8, color: color.white },
  line: { marginTop: 12, textAlign: "center", fontFamily: font.body, fontSize: 16.5, lineHeight: 23, color: color.dim },
  actions: { alignSelf: "stretch", gap: 10, marginTop: 30 },
});
