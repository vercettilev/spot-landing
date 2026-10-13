import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { DarkTheme, NavigationContainer, createNavigationContainerRef, type Theme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useRef } from "react";
import { PixelRatio } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { BagScreen } from "./screens/BagScreen";
import { ChooseScreen } from "./screens/ChooseScreen";
import { CoinScreen } from "./screens/CoinScreen";
import { ConnectScreen } from "./screens/ConnectScreen";
import { DepositScreen } from "./screens/DepositScreen";
import { MeScreen } from "./screens/MeScreen";
import { ResolveScreen } from "./screens/ResolveScreen";
import { SniffScreen } from "./screens/SniffScreen";
import { useIncomingShare } from "./share";
import { color, font, leading, size, space, type } from "./theme";
import type { Candidate, Share, Source } from "./types";

/**
 * THREE TABS AND WHAT OPENS OVER THEM. Sniff (paste, try, recent), Bag
 * (the wallet, what it made, every trade), Me (profile and settings). A
 * share, from any app at any moment, opens over whichever tab is showing
 * and goes back to it. Alerts comes back as a tab when pings are real
 * (soon.ts); until then there is nothing to show there.
 */

export type RootParams = {
  Tabs: undefined;
  Resolve: { share: Share };
  /** `side: "sell"` opens on the Sell side, as from the bag; `continues` fades it in over the reading screen it replaces. */
  Coin: { candidate: Candidate; source: Source | null; share: Share | null; others: Candidate[]; side?: "buy" | "sell"; continues?: boolean };
  Choose: { title: string; line: string; candidates: Candidate[]; source: Source | null; share: Share | null; current?: Candidate; continues?: boolean };
  /** `need`: the ape it is for, so the swap that covers it is picked already. */
  Deposit: { need?: number } | undefined;
  /** `ape`: connecting to ape this much, so a short wallet goes straight on to Add cash; `track`: offer to track an address too. */
  Connect: { ape?: number; track?: boolean } | undefined;
};

export type TabParams = { Sniff: undefined; Bag: undefined; Me: undefined };

export const navRef = createNavigationContainerRef<RootParams>();

const Stack = createNativeStackNavigator<RootParams>();
const Tab = createBottomTabNavigator<TabParams>();

const SHEET = { presentation: "transparentModal", animation: "none", contentStyle: { backgroundColor: "transparent" } } as const;

const THEME: Theme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, primary: color.orange, background: color.ink, card: color.ink, text: color.white, border: color.line },
};

const ICONS: Record<keyof TabParams, string> = {
  Sniff: "M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM20 20l-4.6-4.6",
  Bag: "M5.5 8h13l-1 12h-11l-1-12zM9 8V7a3 3 0 0 1 6 0v1",
  Me: "M12 12.5a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4.5 21a7.5 7.5 0 0 1 15 0",
};

function TabIcon({ name, tint }: { name: keyof TabParams; tint: string }) {
  return (
    <Svg width={size.icon} height={size.icon} viewBox="0 0 24 24" fill="none" stroke={tint} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
      <Path d={ICONS[name]} />
    </Svg>
  );
}

/* React Navigation's tab item pads 5 above and below and boxes its icon in 28. */
const TAB_ITEM_PAD = 5;
const TAB_ICON_BOX = 28;

function Tabs() {
  /* Taller than the stock 49: the labels are set in the landing's grotesk,
     which needs more room under the icon than the system font (theme.ts).
     And it grows with the phone's text size, or the largest settings cut
     the labels in half. */
  const insets = useSafeAreaInsets();
  const labelLine = Math.ceil(leading.micro * PixelRatio.getFontScale());
  const bar = Math.max(size.tabBar, 2 * TAB_ITEM_PAD + TAB_ICON_BOX + labelLine + 2 * space.x1 + space.hair);
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: color.orange,
        tabBarInactiveTintColor: color.faint,
        tabBarStyle: { backgroundColor: color.ink, borderTopColor: color.line, height: bar + insets.bottom, paddingTop: space.x1, paddingBottom: space.x1 + insets.bottom },
        tabBarLabelStyle: { fontFamily: font.bodyBold, fontSize: type.micro, lineHeight: leading.micro },
        tabBarIcon: ({ color: tint }) => <TabIcon name={route.name} tint={tint} />,
      })}
    >
      <Tab.Screen name="Sniff" component={SniffScreen} />
      <Tab.Screen name="Bag" component={BagScreen} />
      <Tab.Screen name="Me" component={MeScreen} />
    </Tab.Navigator>
  );
}

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
        <Stack.Screen name="Tabs" component={Tabs} />
        <Stack.Screen name="Resolve" component={ResolveScreen} options={{ animation: "fade" }} />
        <Stack.Screen name="Coin" component={CoinScreen} options={({ route }) => ({ animation: route.params.continues ? "fade" : "slide_from_right" })} />
        <Stack.Screen name="Choose" component={ChooseScreen} options={({ route }) => ({ animation: route.params.continues ? "fade" : "slide_from_right" })} />
        {/* Sheets: the screen they belong to stays in view behind them, and they bring their own motion. */}
        <Stack.Screen name="Deposit" component={DepositScreen} options={SHEET} />
        <Stack.Screen name="Connect" component={ConnectScreen} options={SHEET} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
