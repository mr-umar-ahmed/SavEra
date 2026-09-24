import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["components/**/*.test.{ts,tsx}", "hooks/**/*.test.{ts,tsx}", "lib/**/*.test.ts"],
    css: false,
    globals: false,
  },
});
