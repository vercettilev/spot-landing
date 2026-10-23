package spot.sharetarget

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.core.content.pm.ShortcutInfoCompat
import androidx.core.content.pm.ShortcutManagerCompat
import androidx.core.graphics.drawable.IconCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

/**
 * SPOT IN THE SHARE SHEET'S TOP ROW. Android's sharing shortcuts: one
 * shortcut, "Sniff it", that the share sheet may offer among its direct
 * targets (the row of people and places above the apps) whenever text or
 * an image is shared. The share sheet ranks those by use, so every share
 * that reaches Spot reports one, by whichever road it came. The share
 * targets it matches are declared by plugins/withShareTarget.js.
 *
 * The launcher lists the same shortcut on a long press of Spot's icon,
 * where "Sniff it" sniffs what is copied: Home's Paste CA (spot://paste).
 */
class ShareTargetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("SpotShareTarget")

    /* Each time the app starts: the shortcut is there and current, without counting a use. */
    Function("publish") { publish(appContext.reactContext, used = false) }

    /* A share reached Spot. */
    Function("used") { publish(appContext.reactContext, used = true) }
  }

  private fun publish(context: Context?, used: Boolean) {
    if (context == null) return
    val shortcut = ShortcutInfoCompat.Builder(context, ID)
      /* One label for both places: the share sheet shows a long label over a short one, as the launcher does. */
      .setShortLabel("Sniff it")
      .setIcon(IconCompat.createWithResource(context, context.applicationInfo.icon))
      .setIntent(Intent(Intent.ACTION_VIEW, Uri.parse("spot://paste")).setPackage(context.packageName))
      .setLongLived(true)
      .setCategories(setOf(CATEGORY))
      .build()
    try {
      if (used) {
        /* Publishes it if it is not there, and reports the use either way. */
        ShortcutManagerCompat.pushDynamicShortcut(context, shortcut)
      } else {
        /* Publishes it, or brings one an older Spot published up to date. */
        ShortcutManagerCompat.addDynamicShortcuts(context, listOf(shortcut))
      }
    } catch (e: Exception) {
      /* Shortcuts refused (a rate limit, a launcher without them): Spot stays among the share sheet's apps. */
    }
  }

  companion object {
    /* Never reused for anything else: the share sheet's ranking remembers it. */
    const val ID = "sniff"
    /* The category plugins/withShareTarget.js gives the share targets. */
    const val CATEGORY = "fun.usespot.app.SHARE_TARGET"
  }
}
