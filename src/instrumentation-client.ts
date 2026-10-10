import { initBotId } from "botid/client/core";

/**
 * BOT PROTECTION FOR THE FORM. BotID Basic runs an invisible client-side
 * challenge and needs no third-party account.
 *
 * THE PATH LIST IS LOAD-BEARING: checkBotId() on the server fails for a route
 * not declared here, because this is what makes the browser attach the
 * challenge headers. A new protected route goes in both places or real people
 * are locked out.
 */
initBotId({
  protect: [{ path: "/api/waitlist", method: "POST" }],
});
