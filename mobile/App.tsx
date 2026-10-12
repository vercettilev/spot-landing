import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { StyleSheet } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import { Spot } from "./src/Spot";
import { color } from "./src/theme";

SplashScreen.preventAutoHideAsync().catch(() => {});

/* The landing's three faces, one weight at a time: requiring a family's
   index would bundle every weight it ships. */
const FONTS = {
  Rubik_800ExtraBold: require("@expo-google-fonts/rubik/800ExtraBold/Rubik_800ExtraBold.ttf"),
  Rubik_900Black: require("@expo-google-fonts/rubik/900Black/Rubik_900Black.ttf"),
  SchibstedGrotesk_400Regular: require("@expo-google-fonts/schibsted-grotesk/400Regular/SchibstedGrotesk_400Regular.ttf"),
  SchibstedGrotesk_600SemiBold: require("@expo-google-fonts/schibsted-grotesk/600SemiBold/SchibstedGrotesk_600SemiBold.ttf"),
  SchibstedGrotesk_700Bold: require("@expo-google-fonts/schibsted-grotesk/700Bold/SchibstedGrotesk_700Bold.ttf"),
  IBMPlexMono_500Medium: require("@expo-google-fonts/ibm-plex-mono/500Medium/IBMPlexMono_500Medium.ttf"),
};

export default function App() {
  const [loaded, error] = useFonts(FONTS);

  useEffect(() => {
    if (loaded || error) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error]);

  if (!loaded && !error) return null;

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <SafeAreaView style={styles.root} edges={["top", "left", "right"]}>
        <Spot />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: color.ink },
});
