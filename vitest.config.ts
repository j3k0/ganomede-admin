import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    passWithNoTests: true,
    env: {
      ADMIN_USERNAME: "testadmin",
      ADMIN_PASSWORD: "testpassword",
      API_SECRET: "test-secret",
      CURRENCY_CODES: "gold,silver",
      LOG_LEVEL: "silent",
    },
  },
});
