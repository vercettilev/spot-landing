import { extractTextFromImage, isSupported } from "expo-text-extractor";
import { Platform } from "react-native";
import { readablePath } from "./logic";

/* A screenshot shared to Spot, read on the phone with ML Kit: the text
   goes to /api/resolve like any shared text, the image never leaves. */
export async function readScreenshot(uri: string): Promise<string | null> {
  if (!isSupported) return null;
  try {
    const lines = await extractTextFromImage(readablePath(uri, Platform.OS));
    const text = lines.join("\n").trim();
    return text || null;
  } catch {
    return null;
  }
}
