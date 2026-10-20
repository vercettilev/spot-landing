const fs = require("fs");
const path = require("path");
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");

/**
 * SPOT IN THE MENU OVER SELECTED TEXT. Select a CA in an app that lets you
 * (a browser, a wallet's browser, most chats) and the menu that offers Copy
 * and Share offers Spot too, sometimes under ⋮: Android's PROCESS_TEXT.
 *
 * The menu starts its app inside the app the text is in, so the main
 * activity never takes it: a small activity with no screen of its own does,
 * and hands the words to the main activity as a text share in Spot's own
 * task, which is the road every share already takes (expo-share-intent,
 * src/share.ts). Then it is gone; the app the text came from gets nothing
 * back and changes nothing.
 */
const PROCESS_TEXT = "android.intent.action.PROCESS_TEXT";
const NAME = "ProcessTextActivity";

/* Kotlin's hard keywords, which a package path writes in backticks (fun.usespot.app). */
const KEYWORDS = new Set(["as", "break", "class", "continue", "do", "else", "false", "for", "fun", "if", "in", "interface", "is", "null", "object", "package", "return", "super", "this", "throw", "true", "try", "typealias", "typeof", "val", "var", "when", "while"]);

const source = (pkg) => `package ${pkg
  .split(".")
  .map((s) => (KEYWORDS.has(s) ? `\`${s}\`` : s))
  .join(".")}

import android.app.Activity
import android.content.Intent
import android.os.Bundle

/* Spot picked from the menu over selected text: the words go to Spot as a text share, in Spot's own task. Written by plugins/withSelectedText.js. */
class ${NAME} : Activity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    val text = intent?.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()?.trim()
    if (!text.isNullOrEmpty()) {
      startActivity(
        Intent(this, MainActivity::class.java)
          .setAction(Intent.ACTION_SEND)
          .setType("text/plain")
          .putExtra(Intent.EXTRA_TEXT, text)
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
      )
    }
    finish()
  }
}
`;

const withMenuEntry = (config) =>
  withAndroidManifest(config, (c) => {
    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    const activities = (app.activity ??= []);
    if (!activities.some((a) => a.$["android:name"] === `.${NAME}`)) {
      activities.push({
        $: {
          "android:name": `.${NAME}`,
          "android:exported": "true",
          "android:label": "@string/app_name",
          "android:theme": "@android:style/Theme.Translucent.NoTitleBar",
          "android:excludeFromRecents": "true",
          "android:noHistory": "true",
        },
        "intent-filter": [
          {
            action: [{ $: { "android:name": PROCESS_TEXT } }],
            category: [{ $: { "android:name": "android.intent.category.DEFAULT" } }],
            data: [{ $: { "android:mimeType": "text/plain" } }],
          },
        ],
      });
    }
    return c;
  });

const withActivitySource = (config) =>
  withDangerousMod(config, [
    "android",
    async (c) => {
      const pkg = c.android?.package;
      if (!pkg) throw new Error("withSelectedText: android.package is not set");
      const dir = path.join(c.modRequest.platformProjectRoot, "app", "src", "main", "java", ...pkg.split("."));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${NAME}.kt`), source(pkg));
      return c;
    },
  ]);

module.exports = (config) => withActivitySource(withMenuEntry(config));
