import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { createApp } from "../../../src/server/app.js";
import { parseConfig } from "../../../src/server/config.js";

const UPSTREAM = "http://localhost:9999";

const config = parseConfig({
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "secret",
  API_SECRET: "test-secret",
  CURRENCY_CODES: "gold,silver",
  UPSTREAM_URL: UPSTREAM,
  CHAT_ROOM_PREFIX: "triominos/v1",
  USER_METADATA_LIST: "locale,auth",
});

const pkg = { name: "admin", version: "2.0.0", description: "Test", api: "admin/v1" };

const mswServer = setupServer();
// Use "bypass" so supertest requests to the local Express app are not intercepted by MSW.
// Only requests to UPSTREAM (localhost:9999) are handled by MSW handlers.
beforeAll(() => mswServer.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

function createTestApp() {
  return createApp({ config, pkg });
}

async function loginAndGetCookie(app: ReturnType<typeof createTestApp>) {
  const loginRes = await request(app)
    .post("/admin/v1/api/login")
    .send({ username: "admin", password: "secret" });
  return loginRes.headers["set-cookie"][0];
}


const STATS = `${UPSTREAM}/statistics/v1/triominos/v1/admin`;

describe("ranking routes", () => {
  describe("GET /api/users/:userId/ranking", () => {
    it("proxies to the statistics admin API with the secret in a header", async () => {
      let secretHeader: string | null = null;
      let url = "";
      mswServer.use(
        http.get(`${STATS}/alice`, ({ request }) => {
          secretHeader = request.headers.get("x-api-secret");
          url = request.url;
          return HttpResponse.json({ username: "alice", level: 1200, rank: 3, adjustments: [] });
        }),
      );
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);
      const res = await request(app).get("/admin/v1/api/users/alice/ranking").set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ username: "alice", level: 1200, rank: 3, adjustments: [] });
      expect(secretHeader).toBe("test-secret");
      expect(url).not.toContain("secret");
    });

    it("encodes the username so it can't change the upstream path", async () => {
      let path = "";
      mswServer.use(
        http.get(`${STATS}/:name`, ({ request }) => {
          path = new URL(request.url).pathname;
          return HttpResponse.json({ username: "x", level: 0, rank: 0, adjustments: [] });
        }),
      );
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);
      await request(app).get("/admin/v1/api/users/a%23b/ranking").set("Cookie", cookie);
      expect(path).toBe("/statistics/v1/triominos/v1/admin/a%23b");
    });

    it("maps upstream 401 to 502 so the admin isn't logged out", async () => {
      mswServer.use(http.get(`${STATS}/alice`, () => HttpResponse.json({}, { status: 401 })));
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);
      const res = await request(app).get("/admin/v1/api/users/alice/ranking").set("Cookie", cookie);
      expect(res.status).toBe(502);
    });

    it("returns 404 for unknown players", async () => {
      mswServer.use(http.get(`${STATS}/ghost`, () => HttpResponse.json({}, { status: 404 })));
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);
      const res = await request(app).get("/admin/v1/api/users/ghost/ranking").set("Cookie", cookie);
      expect(res.status).toBe(404);
    });
  });

  describe("POST /api/users/:userId/ranking/adjust", () => {
    it("forwards delta, reason, expectedLevel and the admin as 'by'", async () => {
      let body: unknown = null;
      let secretHeader: string | null = null;
      mswServer.use(
        http.post(`${STATS}/alice/adjust`, async ({ request }) => {
          body = await request.json();
          secretHeader = request.headers.get("x-api-secret");
          return HttpResponse.json({ level: 700, rank: 40 });
        }),
      );
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);
      const res = await request(app)
        .post("/admin/v1/api/users/alice/ranking/adjust")
        .set("Cookie", cookie)
        .send({ delta: -500, reason: "  farming, FOV-1545 ", expectedLevel: 1200, by: "spoofed" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ level: 700, rank: 40 });
      expect(secretHeader).toBe("test-secret");
      expect(body).toEqual({ delta: -500, reason: "farming, FOV-1545", expectedLevel: 1200, by: "admin" });
    });

    it("passes a 202 (queued) through", async () => {
      mswServer.use(http.post(`${STATS}/alice/adjust`, () => new HttpResponse(null, { status: 202 })));
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);
      const res = await request(app)
        .post("/admin/v1/api/users/alice/ranking/adjust")
        .set("Cookie", cookie)
        .send({ delta: 10, reason: "refund", expectedLevel: 0 });
      expect(res.status).toBe(202);
    });

    it("returns a readable 409 when the level changed", async () => {
      mswServer.use(
        http.post(`${STATS}/alice/adjust`, () => HttpResponse.json({ level: 1230 }, { status: 409 })),
      );
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);
      const res = await request(app)
        .post("/admin/v1/api/users/alice/ranking/adjust")
        .set("Cookie", cookie)
        .send({ delta: -500, reason: "farming", expectedLevel: 1200 });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/Points changed/);
    });

    it.each([
      ["zero delta", { delta: 0, reason: "x", expectedLevel: 10 }],
      ["non-integer delta", { delta: 1.5, reason: "x", expectedLevel: 10 }],
      ["string delta", { delta: "-5", reason: "x", expectedLevel: 10 }],
      ["delta too large", { delta: -100_001, reason: "x", expectedLevel: 10 }],
      ["missing reason", { delta: -5, expectedLevel: 10 }],
      ["blank reason", { delta: -5, reason: "   ", expectedLevel: 10 }],
      ["reason too long", { delta: -5, reason: "x".repeat(201), expectedLevel: 10 }],
      ["missing expectedLevel", { delta: -5, reason: "x" }],
      ["negative expectedLevel", { delta: -5, reason: "x", expectedLevel: -1 }],
    ])("rejects %s without calling upstream", async (_name, payload) => {
      let called = false;
      mswServer.use(
        http.post(`${STATS}/alice/adjust`, () => {
          called = true;
          return HttpResponse.json({});
        }),
      );
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);
      const res = await request(app)
        .post("/admin/v1/api/users/alice/ranking/adjust")
        .set("Cookie", cookie)
        .send(payload);
      expect(res.status).toBe(400);
      expect(called).toBe(false);
    });

    it("requires admin auth", async () => {
      const app = createTestApp();
      const res = await request(app)
        .post("/admin/v1/api/users/alice/ranking/adjust")
        .send({ delta: -5, reason: "x", expectedLevel: 10 });
      expect(res.status).toBe(401);
    });
  });
});
