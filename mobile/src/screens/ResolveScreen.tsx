import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorLine, resolveShare, type ApiError } from "../api";
import { Status } from "../components/Status";
import { sourceLine } from "../logic";
import type { RootParams } from "../navigation";
import type { ResolveResult, Share } from "../types";

type Props = NativeStackScreenProps<RootParams, "Resolve">;

function whichLine(r: ResolveResult, share: Share): string {
  const from = sourceLine(r.source, share);
  const symbols = new Set(r.candidates.map((c) => c.token.symbol.toLowerCase()));
  if (symbols.size === 1 && r.candidates[0]?.via === "cashtag") {
    return `$${r.candidates[0].token.symbol} is ${r.candidates.length} different coins. Pick the one ${from.replace(/^from /, "")} meant.`;
  }
  if (r.candidates.every((c) => c.via === "name")) return "Spot found a name, not a CA. Is it this one?";
  return `${r.candidates.length} coins in that share, ${from}. Pick one.`;
}

/**
 * READING A SHARE. The post or the paste goes to /api/resolve; one coin
 * opens it, several ask which, none says so. This screen is replaced by
 * what it finds, so back from the coin goes to where the share began.
 */
export function ResolveScreen({ navigation, route }: Props) {
  const { share } = route.params;
  const [state, setState] = useState<{ kind: "reading" } | { kind: "none"; unread: boolean } | { kind: "failed"; error: ApiError }>({ kind: "reading" });
  const run = useRef(0);

  const read = useCallback(async () => {
    const id = ++run.current;
    setState({ kind: "reading" });
    if (share.from === "screenshot" && !share.text) {
      setState({ kind: "none", unread: true });
      return;
    }
    const res = await resolveShare(share);
    if (id !== run.current) return;
    if (!res.ok) {
      setState({ kind: "failed", error: res.error });
      return;
    }
    const r = res.value;
    if (r.status === "found" && r.pick) {
      const pick = r.pick;
      navigation.replace("Coin", { candidate: pick, source: r.source, share, others: r.candidates.filter((c) => c.token.mint !== pick.token.mint) });
    } else if (r.status === "ambiguous" && r.candidates.length) {
      navigation.replace("Choose", { title: "Which one?", line: whichLine(r, share), candidates: r.candidates, source: r.source, share });
    } else {
      setState({ kind: "none", unread: r.missed.includes("post") });
    }
  }, [navigation, share]);

  useEffect(() => {
    void read();
    return () => {
      run.current++;
    };
  }, [read]);

  if (state.kind === "reading") {
    return (
      <Status
        busy
        title={share.from === "screenshot" ? "Reading the screenshot…" : share.url ? "Reading the post…" : "Sniffing out the coin…"}
        line={share.url ?? share.text ?? null}
      />
    );
  }
  if (state.kind === "failed") {
    return (
      <Status
        title="Spot couldn't ask."
        line={errorLine(state.error)}
        primary={{ label: "Try again", onPress: () => void read() }}
        secondary={{ label: "Back", onPress: () => navigation.goBack() }}
      />
    );
  }
  const screenshot = share.from === "screenshot";
  return (
    <Status
      title={state.unread ? (screenshot ? "No words in that screenshot." : "Couldn't read that post.") : "No coin in there."}
      line={
        state.unread
          ? screenshot
            ? "Spot reads the text in a screenshot. Try one with the CA or the $cashtag in view."
            : "It may be private or deleted. Paste the CA or the $cashtag instead."
          : "Spot looks for a CA, a $cashtag or a coin's link. Paste one instead?"
      }
      primary={{ label: "Paste one", onPress: () => navigation.goBack() }}
    />
  );
}
