import { describe, it, expect } from "vitest";
import { parseConfig } from "../../src/server/config.js";

const VALID_ENV = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "secret",
  API_SECRET: "api-secret",
  CURRENCY_CODES: "gold,silver",
  UPSTREAM_URL: "http://localhost:8080",
};

describe("config", () => {
  it("parses valid env vars", () => {
    const config = parseConfig(VALID_ENV);
    expect(config.PORT).toBe(8000);
    expect(config.HOST).toBe("0.0.0.0");
    expect(config.ADMIN_USERNAME).toBe("admin");
    expect(config.ADMIN_PASSWORD).toBe("secret");
    expect(config.API_SECRET).toBe("api-secret");
    expect(config.CURRENCY_CODES).toEqual(["gold", "silver"]);
    expect(config.UPSTREAM_URL).toBe("http://localhost:8080");
    expect(config.BRANDING_TITLE).toBe("Ganomede");
    expect(config.UPSTREAM_TIMEOUT_MS).toBe(30000);
  });

  it("uses defaults for optional fields", () => {
    const config = parseConfig(VALID_ENV);
    expect(config.HOST).toBe("0.0.0.0");
    expect(config.PORT).toBe(8000);
    expect(config.BRANDING_TITLE).toBe("Ganomede");
    expect(config.CHAT_ROOM_PREFIX).toBe("");
    expect(config.USER_METADATA_LIST).toEqual([]);
  });

  it("throws when ADMIN_USERNAME is missing", () => {
    const env = { ...VALID_ENV, ADMIN_USERNAME: undefined };
    expect(() => parseConfig(env)).toThrow();
  });

  it("throws when ADMIN_PASSWORD is missing", () => {
    const env = { ...VALID_ENV, ADMIN_PASSWORD: undefined };
    expect(() => parseConfig(env)).toThrow();
  });

  it("throws when API_SECRET is missing", () => {
    const env = { ...VALID_ENV, API_SECRET: undefined };
    expect(() => parseConfig(env)).toThrow();
  });

  it("throws when CURRENCY_CODES is missing", () => {
    const env = { ...VALID_ENV, CURRENCY_CODES: undefined };
    expect(() => parseConfig(env)).toThrow();
  });

  it("allows UPSTREAM_URL to be absent (legacy mode)", () => {
    const env = { ...VALID_ENV, UPSTREAM_URL: undefined };
    const config = parseConfig(env);
    expect(config.UPSTREAM_URL).toBeUndefined();
  });

  it("rejects non-HTTP UPSTREAM_URL", () => {
    const env = { ...VALID_ENV, UPSTREAM_URL: "ftp://bad" };
    expect(() => parseConfig(env)).toThrow();
  });

  it("parses CURRENCY_CODES as comma-separated array", () => {
    const env = { ...VALID_ENV, CURRENCY_CODES: "gold,silver,gems" };
    const config = parseConfig(env);
    expect(config.CURRENCY_CODES).toEqual(["gold", "silver", "gems"]);
  });

  it("parses mailer config when MAILER_HOST is set", () => {
    const env = { ...VALID_ENV, MAILER_HOST: "smtp.example.com", MAILER_USER: "user", MAILER_PASSWORD: "pass" };
    const config = parseConfig(env);
    expect(config.MAILER_HOST).toBe("smtp.example.com");
    expect(config.MAILER_PORT).toBe(587);
  });

  it("mailer is disabled when MAILER_HOST is absent", () => {
    const config = parseConfig(VALID_ENV);
    expect(config.MAILER_HOST).toBeUndefined();
  });
});
