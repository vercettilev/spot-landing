import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

/* Node environment: what is worth testing is the waitlist's reasoning in
   src/lib and the route that applies it, not React rendering. */
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: { environment: "node", include: ["src/**/*.spec.ts"] },
});
