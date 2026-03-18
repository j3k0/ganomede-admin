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

describe("user routes", () => {
  describe("GET /api/users/search/:query", () => {
    it("searches by id, email, and tag in parallel", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/directory/v1/users/id/alice`, () =>
          HttpResponse.json({ id: "alice", aliases: {} }),
        ),
        http.get(`${UPSTREAM}/directory/v1/users/alias/email/alice`, () =>
          HttpResponse.json({}, { status: 404 }),
        ),
        http.get(`${UPSTREAM}/directory/v1/users/alias/tag/alice`, () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/search/alice")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.query).toBe("alice");
      expect(res.body.matchingIds).toContain("alice");
      expect(res.body.results).toHaveLength(3);
    });
  });

  describe("POST /api/users/:userId/rewards", () => {
    it("awards currency to user", async () => {
      mswServer.use(
        http.post(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret.alice/rewards`, () =>
          HttpResponse.json({ ok: true }),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .post("/admin/v1/api/users/alice/rewards")
        .set("Cookie", cookie)
        .send({ amount: 100, currency: "gold" });

      expect(res.status).toBe(200);
    });

    it("rejects invalid reward amount", async () => {
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .post("/admin/v1/api/users/alice/rewards")
        .set("Cookie", cookie)
        .send({ amount: -1, currency: "gold" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/users/chat/:u1/:u2", () => {
    it("sorts usernames and fetches chat room", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/chat/v1/auth/test-secret/rooms/*`, ({ request }) => {
          const url = new URL(request.url);
          expect(decodeURIComponent(url.pathname)).toContain("triominos/v1/alice/bob");
          return HttpResponse.json({ users: ["alice", "bob"], messages: [{ from: "alice", message: "hi" }] });
        }),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/chat/bob/alice")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
    });

    it("returns empty messages for non-existent chat room", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/chat/v1/auth/test-secret/rooms/*`, () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/chat/alice/bob")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
    });
  });
});
