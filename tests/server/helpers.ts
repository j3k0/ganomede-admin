import { type Express } from "express";

/**
 * Minimal env vars for config to parse without errors.
 * Tests can override individual vars before importing config.
 */
export const TEST_ENV = {
  ADMIN_USERNAME: "testadmin",
  ADMIN_PASSWORD: "testpassword",
  API_SECRET: "test-secret",
  CURRENCY_CODES: "gold,silver",
  UPSTREAM_URL: "http://localhost:9999",
} as const;

/**
 * Set env vars for a test, restore after.
 */
export function withEnv(overrides: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
}
