import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { Chooser } from "../components/Chooser";
import type { RootParams } from "../navigation";

type Props = NativeStackScreenProps<RootParams, "Choose">;

/** "Which one?", as a screen: the pick replaces it, so back skips the question. */
export function ChooseScreen({ navigation, route }: Props) {
  const { title, line, candidates, source, share, current } = route.params;
  const all = current ? [current, ...candidates] : candidates;
  return (
    <Chooser
      title={title}
      line={line}
      candidates={candidates}
      onBack={() => navigation.goBack()}
      onPick={(pick) =>
        navigation.replace("Coin", { candidate: pick, source, share, others: all.filter((c) => c.token.mint !== pick.token.mint) })
      }
    />
  );
}
