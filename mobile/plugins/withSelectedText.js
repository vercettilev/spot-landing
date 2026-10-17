const { AndroidConfig, withAndroidManifest, withMainActivity } = require("expo/config-plugins");
const { mergeContents } = require("@expo/config-plugins/build/utils/generateCode");

/**
 * SPOT IN THE MENU OVER SELECTED TEXT. Select a CA in an app that lets you
 * (a browser, a wallet's browser, most chats) and the menu that offers Copy
 * and Share offers Spot too, sometimes under ⋮: Android's PROCESS_TEXT.
 *
 * The selection then arrives the way a share does. The main activity turns
 * it into a text share before React Native or any module sees it, so
 * expo-share-intent and src/share.ts take it with nothing new. The share is
 * addressed to this activity: picked from another app's menu, Spot opens in
 * that app's task, and expo-share-intent moves it to its own by starting
 * the intent again, which has to come back here, not to a share chooser.
 */
const PROCESS_TEXT = "android.intent.action.PROCESS_TEXT";

const withMenuEntry = (config) =>
  withAndroidManifest(config, (c) => {
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(c.modResults);
    const filters = (main["intent-filter"] ??= []);
    if (!filters.some((f) => f.action?.some((a) => a.$["android:name"] === PROCESS_TEXT))) {
      filters.push({
        action: [{ $: { "android:name": PROCESS_TEXT } }],
        category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
        data: [{ $: { "android:mimeType": "text/plain" } }],
      });
    }
    return c;
  });

const AS_SHARE = `  /* Spot picked from the menu over selected text: the selection, as a text share. */
  override fun onNewIntent(intent: Intent) {
    super.onNewIntent(asShare(intent))
  }

  private fun asShare(intent: Intent): Intent {
    if (intent.action != Intent.ACTION_PROCESS_TEXT) return intent
    val text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()?.trim()
    if (text.isNullOrEmpty()) return Intent(this, MainActivity::class.java)
    return Intent(this, MainActivity::class.java).setAction(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
  }
`;

/* Each piece goes in at a line of Expo's template; a template without that
   line fails the build here rather than shipping without the menu. */
const withSelectionAsShare = (config) =>
  withMainActivity(config, (c) => {
    if (c.modResults.language !== "kt") throw new Error("withSelectedText: MainActivity is not Kotlin");
    let src = c.modResults.contents;
    if (!/^import android\.content\.Intent$/m.test(src)) {
      src = mergeContents({ src, newSrc: "import android.content.Intent", tag: "spot-selected-text-import", anchor: /^import android\.os\.Bundle$/, offset: 0, comment: "//" }).contents;
    }
    src = mergeContents({ src, newSrc: AS_SHARE, tag: "spot-selected-text", anchor: /override fun onCreate\(/, offset: 0, comment: "  //" }).contents;
    src = mergeContents({ src, newSrc: "    intent?.let { setIntent(asShare(it)) }", tag: "spot-selected-text-launch", anchor: /super\.onCreate\(/, offset: 0, comment: "    //" }).contents;
    c.modResults.contents = src;
    return c;
  });

module.exports = (config) => withSelectionAsShare(withMenuEntry(config));
