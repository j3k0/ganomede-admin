import { describe, it, expect, vi, afterEach } from "vitest";

// Pins the actual startup line in src/server/index.ts (the one that leaked
// MAILER_PASSWORD, FOV-1863), not just the redaction helper.
const info = vi.fn();
vi.mock("../../src/server/logger.js", () => ({
  logger: { info, fatal: vi.fn(), child: vi.fn() },
}));
vi.mock("../../src/server/app.js", () => ({
  createApp: () => ({ listen: vi.fn() }),
}));

afterEach(() => vi.unstubAllEnvs());

describe("startup log", () => {
  it("logs the config with no secret value in it", async () => {
    vi.stubEnv("MAILER_HOST", "smtp.example.com");
    vi.stubEnv("MAILER_USER", "user@example.com");
    vi.stubEnv("MAILER_PASSWORD", "mail-secret-value");
    vi.stubEnv("UPSTREAM_URL", "https://user:url-secret-value@example.com");
    await import("../../src/server/index.js");

    const call = info.mock.calls.find((c) => c[1] === "Starting");
    expect(call).toBeDefined();
    const logged = JSON.stringify(call);
    expect(logged).toContain("smtp.example.com");
    for (const secret of ["testpassword", "test-secret", "mail-secret-value", "url-secret-value"]) {
      expect(logged).not.toContain(secret);
    }
  });
});
