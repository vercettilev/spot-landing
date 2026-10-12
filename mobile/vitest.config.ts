import { defineConfig } from "vitest/config";

/* Only the plain-TypeScript logic is tested here, in Node; the screens are
   checked on the web build and on a phone. */
export default defineConfig({
  test: { environment: "node", include: ["src/**/*.spec.ts"] },
});
