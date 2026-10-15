import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { proxyToUpstream } from "../../src/server/proxy.js";
import { logger } from "../../src/server/logger.js";

const UPSTREAM = "http://localhost:9999";

const mswServer = setupServer();

beforeAll(() => mswServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

describe("proxyToUpstream", () => {
  it("forwards GET requests and returns JSON", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/users/v1/search/alice`, () => {
        return HttpResponse.json({ userId: "alice-123" });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/users/v1/search/alice", {
      method: "GET",
      timeoutMs: 5000,
      redactSecret: "test-secret",
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ userId: "alice-123" });
  });

  it("forwards POST requests with body", async () => {
    mswServer.use(
      http.post(`${UPSTREAM}/users/v1/ban`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ banned: true, user: (body as Record<string, unknown>).userId });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/users/v1/ban", {
      method: "POST",
      body: { userId: "alice" },
      timeoutMs: 5000,
      redactSecret: "test-secret",
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ banned: true, user: "alice" });
  });

  it("returns binary data when responseType is buffer", async () => {
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    mswServer.use(
      http.get(`${UPSTREAM}/avatars/v1/alice`, () => {
        return new HttpResponse(imageBytes, {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/avatars/v1/alice", {
      method: "GET",
      responseType: "buffer",
      timeoutMs: 5000,
      redactSecret: "test-secret",
    });

    expect(result.status).toBe(200);
    expect(Buffer.isBuffer(result.data)).toBe(true);
    expect((result.data as Buffer)[0]).toBe(0x89);
  });

  it("returns non-2xx status and body on upstream errors", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/users/v1/missing`, () => {
        return HttpResponse.json({ error: "not found" }, { status: 404 });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/users/v1/missing", {
      method: "GET",
      timeoutMs: 5000,
      redactSecret: "test-secret",
    });

    expect(result.status).toBe(404);
    expect(result.data).toEqual({ error: "not found" });
  });

  it("masks the secret in the logged upstream URL and response body", async () => {
    // A secret the module-level config doesn't know: the mask must come from
    // the caller, not from the config singleton.
    const secret = "injected-only-secret";
    mswServer.use(
      http.get(`${UPSTREAM}/chat/v1/auth/${secret}/rooms/r1`, () =>
        // restify's route-miss 404 echoes the pathname
        HttpResponse.json(
          { code: "ResourceNotFound", message: `/chat/v1/auth/${secret}/rooms/r1 does not exist` },
          { status: 404 },
        ),
      ),
    );
    const warn = vi.fn();
    const child = vi.spyOn(logger, "child").mockReturnValue({ warn } as never);
    try {
      const result = await proxyToUpstream(UPSTREAM, `/chat/v1/auth/${secret}/rooms/r1?secret=${secret}`, {
        method: "GET",
        timeoutMs: 5000,
        redactSecret: secret,
      });
      const logged = JSON.stringify([child.mock.calls, warn.mock.calls]);
      expect(warn).toHaveBeenCalled();
      expect(logged).not.toContain(secret);
      expect(logged).toContain("/chat/v1/auth/***/rooms/r1?secret=***");
      expect(logged).toContain("/chat/v1/auth/***/rooms/r1 does not exist");
      // the caller still gets the unmodified body
      expect(JSON.stringify(result.data)).toContain(secret);
    } finally {
      child.mockRestore();
    }
  });

  it("throws on timeout", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/slow`, async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return HttpResponse.json({});
      }),
    );

    await expect(
      proxyToUpstream(UPSTREAM, "/slow", { method: "GET", timeoutMs: 50, redactSecret: "test-secret" }),
    ).rejects.toThrow();
  });

  it("throws on network error", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/network-error`, () => {
        return HttpResponse.error();
      }),
    );

    await expect(
      proxyToUpstream(UPSTREAM, "/network-error", { method: "GET", timeoutMs: 5000, redactSecret: "test-secret" }),
    ).rejects.toThrow();
  });

  it("forwards custom headers", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/auth-test`, ({ request }) => {
        const secret = request.headers.get("X-API-Secret");
        return HttpResponse.json({ secret });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/auth-test", {
      method: "GET",
      headers: { "X-API-Secret": "my-secret" },
      timeoutMs: 5000,
      redactSecret: "test-secret",
    });

    expect(result.data).toEqual({ secret: "my-secret" });
  });
});
