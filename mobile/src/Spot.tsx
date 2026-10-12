import { useCallback, useEffect, useRef, useState } from "react";
import { BackHandler, View } from "react-native";
import { errorLine, resolveShare, type ApiError } from "./api";
import { Chooser } from "./components/Chooser";
import { CoinSheet } from "./components/CoinSheet";
import { Home } from "./components/Home";
import { Status } from "./components/Status";
import { useToast } from "./components/ui";
import { sourceLine } from "./logic";
import { useIncomingShare } from "./share";
import type { Candidate, ResolveResult, Share, Source } from "./types";

/**
 * ONE GESTURE, ONE SCREEN AT A TIME. A share (or a paste) is read, the
 * coin it names opens with its sniff, a share that names several asks
 * which, and one that names none says so. Back always leads somewhere
 * that makes sense, and a newer share always wins over an older one.
 */

type Scene =
  | { kind: "home" }
  | { kind: "reading"; share: Share }
  | { kind: "coin"; share: Share; source: Source; pick: Candidate; others: Candidate[] }
  | { kind: "choose"; share: Share; source: Source; candidates: Candidate[]; title: string; line: string; from: Scene }
  | { kind: "none"; share: Share; result: ResolveResult }
  | { kind: "failed"; share: Share; error: ApiError };

function whichLine(r: ResolveResult, share: Share): string {
  const from = sourceLine(r.source, share);
  const symbols = new Set(r.candidates.map((c) => c.token.symbol.toLowerCase()));
  if (symbols.size === 1 && r.candidates[0]?.via === "cashtag") {
    return `$${r.candidates[0].token.symbol} is ${r.candidates.length} different coins. Pick the one ${from.replace(/^from /, "")} meant.`;
  }
  if (r.candidates.every((c) => c.via === "name")) return "Spot found a name, not a CA. Is it this one?";
  return `${r.candidates.length} coins in that share, ${from}. Pick one.`;
}

export function Spot() {
  const [scene, setScene] = useState<Scene>({ kind: "home" });
  const [toastNode, toast] = useToast();
  const run = useRef(0);

  const open = useCallback(async (share: Share) => {
    const id = ++run.current;
    setScene({ kind: "reading", share });
    const res = await resolveShare(share);
    if (id !== run.current) return;
    if (!res.ok) {
      setScene({ kind: "failed", share, error: res.error });
      return;
    }
    const r = res.value;
    if (r.status === "found" && r.pick) {
      const pick = r.pick;
      setScene({ kind: "coin", share, source: r.source, pick, others: r.candidates.filter((c) => c.token.mint !== pick.token.mint) });
    } else if (r.status === "ambiguous" && r.candidates.length) {
      setScene({ kind: "choose", share, source: r.source, candidates: r.candidates, title: "Which one?", line: whichLine(r, share), from: { kind: "home" } });
    } else {
      setScene({ kind: "none", share, result: r });
    }
  }, []);

  useIncomingShare(open);

  const home = useCallback(() => {
    run.current++;
    setScene({ kind: "home" });
  }, []);

  /* Android's back: up one step, and out of the app only from home. */
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (scene.kind === "home") return false;
      if (scene.kind === "choose") setScene(scene.from);
      else home();
      return true;
    });
    return () => sub.remove();
  }, [scene, home]);

  let body: React.ReactNode;
  switch (scene.kind) {
    case "home":
      body = <Home onShare={open} />;
      break;
    case "reading":
      body = (
        <Status
          busy
          title={scene.share.url ? "Reading the post…" : "Sniffing out the coin…"}
          line={scene.share.url ?? scene.share.text ?? null}
        />
      );
      break;
    case "coin":
      body = (
        <CoinSheet
          key={scene.pick.token.mint}
          share={scene.share}
          source={scene.source}
          pick={scene.pick}
          others={scene.others}
          onBack={home}
          toast={toast}
          onOthers={() =>
            setScene({
              kind: "choose",
              share: scene.share,
              source: scene.source,
              candidates: scene.others,
              title: "Not this one?",
              line: `Other coins in that share, ${sourceLine(scene.source, scene.share)}.`,
              from: scene,
            })
          }
        />
      );
      break;
    case "choose": {
      const all = scene.from.kind === "coin" ? [scene.from.pick, ...scene.candidates] : scene.candidates;
      body = (
        <Chooser
          title={scene.title}
          line={scene.line}
          candidates={scene.candidates}
          onBack={() => setScene(scene.from)}
          onPick={(pick) =>
            setScene({
              kind: "coin",
              share: scene.share,
              source: scene.source,
              pick,
              others: all.filter((c) => c.token.mint !== pick.token.mint),
            })
          }
        />
      );
      break;
    }
    case "none": {
      const unread = scene.result.missed.includes("post");
      body = (
        <Status
          title={unread ? "Couldn't read that post." : "No coin in there."}
          line={
            unread
              ? "It may be private or deleted. Paste the CA or the $cashtag instead."
              : "Spot looks for a CA, a $cashtag or a coin's link. Paste one instead?"
          }
          primary={{ label: "Paste one", onPress: home }}
        />
      );
      break;
    }
    case "failed":
      body = (
        <Status
          title="Spot couldn't ask."
          line={errorLine(scene.error)}
          primary={{ label: "Try again", onPress: () => void open(scene.share) }}
          secondary={{ label: "Back", onPress: home }}
        />
      );
      break;
  }

  return (
    <View style={{ flex: 1 }}>
      {body}
      {toastNode}
    </View>
  );
}
