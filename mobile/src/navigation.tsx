import { DarkTheme, NavigationContainer, createNavigationContainerRef, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useRef } from "react";
import { CashOutScreen } from "./screens/CashOutScreen";
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
  Home: undefined;
  Resolve: { share: Share };
  /** `side: "sell"` opens on the Sell side, as from the bag; `continues` fades it in over the reading screen it replaces. */
  Coin: { candidate: Candidate; source: Source | null; share: Share | null; others: Candidate[]; side?: "buy" | "sell"; continues?: boolean };
  Choose: { title: string; line: string; candidates: Candidate[]; source: Source | null; share: Share | null; current?: Candidate; continues?: boolean };
  /** `need`: the ape it is for, so the swap that covers it is picked already. */
  Deposit: { need?: number } | undefined;
  /** `ape`: connecting to ape this much, so a short wallet goes straight on to Add cash; `track`: offer to track an address too. */
  Connect: { ape?: number; track?: boolean } | undefined;
  /** How cash reaches a bank: through an exchange, from the wallet app. */
  CashOut: undefined;
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
   share sheet): those wait for onReady. */
function useShareRouting() {
  const pending = useRef<Share | null>(null);
  const open = (share: Share) => {
    if (navRef.isReady()) navRef.navigate("Resolve", { share });
    else pending.current = share;
  };
  useIncomingShare(open);
  return () => {
    const share = pending.current;
    pending.current = null;
    if (share) navRef.navigate("Resolve", { share });
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
        <Stack.Screen name="CashOut" component={CashOutScreen} options={SHEET} />
        <Stack.Screen name="Settings" component={SettingsScreen} options={SHEET} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
