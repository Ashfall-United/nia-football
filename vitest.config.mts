import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
      // Next.js's bundler special-cases this import to enforce
      // server-only code paths; outside that bundler (i.e. here, under
      // Vitest) it doesn't resolve to a real package, so alias it to a
      // no-op — the boundary it enforces isn't what these tests are for.
      "server-only": path.resolve(
        import.meta.dirname,
        "./tests/mocks/server-only.ts",
      ),
    },
  },
});
