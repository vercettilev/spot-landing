import { DarkTheme, NavigationContainer, createNavigationContainerRef, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useRef } from "react";
import { Linking } from "react-native";
import { ChooseScreen } from "./screens/ChooseScreen";
import { CoinScreen } from "./screens/CoinScreen";
import { ConnectScreen } from "./screens/ConnectScreen";
import { DepositScreen } from "./screens/DepositScreen";
import { HomeScreen } from "./screens/HomeScreen";
import { ResolveScreen } from "./screens/ResolveScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { useIncomingShare } from "./share";
import { color } from "./theme";
import type { Candidate, Share, Source } from "./types";

/**
 * ONE SCREEN AND WHAT OPENS OVER IT. Home holds the bag, the keys and the
 * coins sniffed lately; a coin opens over it, and so does a share, from any
 * app at any moment, going back to it after. Settings, the wallet and every
 * trade rise as a sheet from Home's puppy. No tabs: there is one place to
 * come back to.
 */

export type RootParams = {
  /** `paste`: Paste CA pressed from outside (the launcher's shortcut), at this time. */
  Home: { paste?: number } | undefined;
  Resolve: { share: Share };
  /** `side: "sell"` opens on the Sell side, as from the bag; `continues` fades it in over the reading screen it replaces. */
  Coin: { candidate: Candidate; source: Source | null; share: Share | null; others: Candidate[]; side?: "buy" | "sell"; continues?: boolean };
  Choose: { title: string; line: string; candidates: Candidate[]; source: Source | null; share: Share | null; current?: Candidate; continues?: boolean };
  /** `need`: the ape it is for, so the swap that covers it is picked already. */
  Deposit: { need?: number; cash?: boolean } | undefined;
  /** `ape`: connecting to ape this much, so a short wallet goes straight on to Add cash; `track`: track an address instead, from Settings. */
  Connect: { ape?: number; mint?: string; track?: boolean } | undefined;
  /** The wallet, every trade, the choices every buy starts with, the app's links. */
  Settings: undefined;
};

export const navRef = createNavigationContainerRef<RootParams>();

const Stack = createNativeStackNavigator<RootParams>();

const SHEET = { presentation: "transparentModal", animation: "none", contentStyle: { backgroundColor: "transparent" } } as const;

const THEME: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: color.orange, background: color.ink, card: color.ink, text: color.white, border: color.line },
};

/* Shares can land before the navigator is ready (a cold start from the
   share sheet): those wait for onReady. So does Paste CA from the
   launcher's shortcut (spot://paste, modules/share-target), which is
   Home's key, pressed. */
function useShareRouting() {
  const pending = useRef<Share | "paste" | null>(null);
  const go = (next: Share | "paste") =>
    next === "paste" ? navRef.navigate("Home", { paste: Date.now() }) : navRef.navigate("Resolve", { share: next });
  const open = (next: Share | "paste") => {
    if (navRef.isReady()) go(next);
    else pending.current = next;
  };
  useIncomingShare(open);
  useEffect(() => {
    const opened = (url: string | null) => {
      if (url?.startsWith("spot://paste")) open("paste");
    };
    Linking.getInitialURL().then(opened, () => {});
    const sub = Linking.addEventListener("url", ({ url }) => opened(url));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return () => {
    const next = pending.current;
    pending.current = null;
    if (next) go(next);
  };
}

export function Navigation() {
  const flush = useShareRouting();
  return (
    <NavigationContainer ref={navRef} theme={THEME} onReady={flush}>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: color.ink }, animation: "slide_from_right" }}>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Resolve" component={ResolveScreen} options={{ animation: "fade" }} />
        <Stack.Screen name="Coin" component={CoinScreen} options={({ route }) => ({ animation: route.params.continues ? "fade" : "slide_from_right" })} />
        <Stack.Screen name="Choose" component={ChooseScreen} options={({ route }) => ({ animation: route.params.continues ? "fade" : "slide_from_right" })} />
        {/* Sheets: the screen they belong to stays in view behind them, and they bring their own motion. */}
        <Stack.Screen name="Deposit" component={DepositScreen} options={SHEET} />
        <Stack.Screen name="Connect" component={ConnectScreen} options={SHEET} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={SHEET} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
