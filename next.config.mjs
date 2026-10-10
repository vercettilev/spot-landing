import { withBotId } from "botid/next/config";

/** @type {import('next').NextConfig} */
const nextConfig = {
  devIndicators: false,
  /* `beforeFiles: []` is load-bearing: withBotId appends its challenge
     rewrites and only understands an array or an object that already has
     `beforeFiles`. */
  async rewrites() {
    return { beforeFiles: [] };
  },
};

/* BotID wraps the config so its challenge is served from this origin, where
   an ad-blocker cannot quietly drop it. */
export default withBotId(nextConfig);
