const fs = require("fs");
const path = require("path");
const { AndroidConfig, withAndroidManifest, withDangerousMod } = require("expo/config-plugins");

/**
 * SPOT IN THE SHARE SHEET'S TOP ROW. Android's sharing shortcuts: the share
 * sheet shows, above its apps, a row of direct targets that apps publish as
 * shortcuts, ranked by use. This declares which shares Spot's shortcut
 * stands for (text and images, as Spot's own share filter takes) and that
 * they open the main activity, the road every share already takes
 * (expo-share-intent, src/share.ts). The shortcut itself is published from
 * the app (modules/share-target), which reports a use with every share.
 */
const CATEGORY = "fun.usespot.app.SHARE_TARGET"; /* modules/share-target's CATEGORY */
const RESOURCE = "share_targets";

const xml = (pkg) => `<?xml version="1.0" encoding="utf-8"?>
<!-- Written by plugins/withShareTarget.js. -->
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
  <share-target android:targetClass="${pkg}.MainActivity">
    <data android:mimeType="text/*" />
    <data android:mimeType="image/*" />
    <category android:name="${CATEGORY}" />
  </share-target>
</shortcuts>
`;

const withShortcutsMeta = (config) =>
  withAndroidManifest(config, (c) => {
    const main = AndroidConfig.Manifest.getMainActivityOrThrow(c.modResults);
    const meta = (main["meta-data"] ??= []);
    if (!meta.some((m) => m.$["android:name"] === "android.app.shortcuts")) {
      meta.push({ $: { "android:name": "android.app.shortcuts", "android:resource": `@xml/${RESOURCE}` } });
    }
    return c;
  });

const withTargetsXml = (config) =>
  withDangerousMod(config, [
    "android",
    async (c) => {
      const pkg = c.android?.package;
      if (!pkg) throw new Error("withShareTarget: android.package is not set");
      const dir = path.join(c.modRequest.platformProjectRoot, "app", "src", "main", "res", "xml");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, `${RESOURCE}.xml`), xml(pkg));
      return c;
    },
  ]);

module.exports = (config) => withTargetsXml(withShortcutsMeta(config));
