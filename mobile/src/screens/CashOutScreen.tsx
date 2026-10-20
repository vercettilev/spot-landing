import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { StyleSheet, Text, View } from "react-native";
import { Sheet, Steps, useRouteSheet } from "../components/ui";
import type { RootParams } from "../navigation";
import { color, font, leading, space, type } from "../theme";

type Props = NativeStackScreenProps<RootParams, "CashOut">;

const STEPS = [
  "In your exchange, tap Deposit, pick USDC on Solana and copy the address it shows.",
  "In your wallet app, tap Send, pick USDC and paste that address.",
  "Back in the exchange, sell the USDC and withdraw to your bank.",
];

/**
 * CASHING OUT, as a sheet over the bag. Spot's cash is USDC in the user's
 * own wallet, and Spot has no bank partner of its own, so this says the way
 * that works today: sent from the wallet app to an exchange, sold there.
 * The one risk, the network, is said in the caution colour.
 */
export function CashOutScreen({ navigation }: Props) {
  const { ref, onDismiss } = useRouteSheet(navigation);
  return (
    <View style={styles.fill}>
      <Sheet ref={ref} visible onDismiss={onDismiss} title="Cash out to your bank" label="Cash out to your bank">
        <Text style={styles.lede}>Sell your USDC on an exchange you use, like Coinbase or Kraken:</Text>
        <Steps steps={STEPS} note="Pick Solana in both apps. USDC sent on another network can be lost." caution style={styles.steps} />
      </Sheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  lede: { fontFamily: font.body, fontSize: type.body, lineHeight: leading.body, color: color.dim },
  steps: { marginTop: space.x5, marginHorizontal: space.x1 },
});
