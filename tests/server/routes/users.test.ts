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

    it("returns empty messages array for non-existent chat room", async () => {
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

  describe("GET /api/users/:userId (profile)", () => {
    function setupProfileHandlers(overrides: Record<string, () => ReturnType<typeof HttpResponse.json>> = {}) {
      const defaults: Record<string, () => ReturnType<typeof HttpResponse.json>> = {
        balance: () => HttpResponse.json([{ currency: "gold", count: 100 }]),
        transactions: () => HttpResponse.json([]),
        ban: () => HttpResponse.json({ exists: false }),
        avatar: () => HttpResponse.json({}, { status: 404 }),
        metadata: () => HttpResponse.json({ alice: { locale: "en", auth: "1711800000000" } }),
        directory: () => HttpResponse.json({ id: "alice", aliases: { name: "Alice", email: "a@b.com" } }),
      };
      const handlers = { ...defaults, ...overrides };

      mswServer.use(
        http.get(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret.alice/coins/*`, handlers.balance),
        http.get(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret.alice/transactions`, handlers.transactions),
        http.get(`${UPSTREAM}/users/v1/banned-users/alice`, handlers.ban),
        http.get(`${UPSTREAM}/avatars/v1/alice/64.png`, handlers.avatar),
        http.get(`${UPSTREAM}/usermeta/v1/alice/*`, handlers.metadata),
        http.get(`${UPSTREAM}/directory/v1/users/id/alice`, handlers.directory),
      );
    }

    it("returns _warnings when upstream services fail", async () => {
      setupProfileHandlers({
        balance: () => HttpResponse.json({}, { status: 500 }),
        metadata: () => HttpResponse.json({}, { status: 503 }),
      });

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/alice")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body._warnings).toContain("balance");
      expect(res.body._warnings).toContain("metadata");
      expect(res.body._warnings).not.toContain("transactions");
    });

    it("returns empty _warnings when all services succeed", async () => {
      setupProfileHandlers();

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/alice")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body._warnings).toEqual([]);
      expect(res.body._transactionsHasMore).toBe(false);
    });

    it("paginates transactions to 50 and sets _transactionsHasMore", async () => {
      const manyTransactions = Array.from({ length: 51 }, (_, i) => ({
        id: `tx-${i}`,
        timestamp: 1711800000000 + i * 1000,
        amount: 10,
        currency: "gold",
        reason: "reward",
        data: { currency: "gold", from: "admin" },
      }));

      setupProfileHandlers({
        transactions: () => HttpResponse.json(manyTransactions),
      });

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/alice")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.transactions).toHaveLength(50);
      expect(res.body._transactionsHasMore).toBe(true);
    });
  });

  describe("GET /api/users/:userId/transactions", () => {
    it("paginates transactions with limit and before params", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret.alice/transactions`, ({ request }) => {
          const url = new URL(request.url);
          const limit = parseInt(url.searchParams.get("limit") || "51");
          const before = url.searchParams.get("before");

          const all = Array.from({ length: 80 }, (_, i) => ({
            id: `tx-${i}`,
            timestamp: 1711800000000 + i * 1000,
            amount: 10,
            currency: "gold",
            reason: "reward",
            data: { currency: "gold", from: "admin" },
          }));

          let filtered = before
            ? all.filter((t) => t.timestamp < parseInt(before))
            : all;
          filtered = filtered.slice(0, limit);
          return HttpResponse.json(filtered);
        }),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      // First page
      const res1 = await request(app)
        .get("/admin/v1/api/users/alice/transactions?limit=20")
        .set("Cookie", cookie);

      expect(res1.status).toBe(200);
      expect(res1.body.transactions).toHaveLength(20);
      expect(res1.body.hasMore).toBe(true);

      // Second page with before cursor
      const res2 = await request(app)
        .get("/admin/v1/api/users/alice/transactions?limit=20&before=1711800020000")
        .set("Cookie", cookie);

      expect(res2.status).toBe(200);
      expect(res2.body.transactions).toHaveLength(20);
    });
  });

  describe("GET /api/users/:userId/games", () => {
    it("proxies to coordinator active-games endpoint", async () => {
      const games = [
        { id: "game1", type: "triominos/v1", players: ["alice", "bob"], status: "active" },
        { id: "game2", type: "triominos/v1", players: ["alice", "carol"], status: "gameover" },
      ];
      mswServer.use(
        http.get(`${UPSTREAM}/coordinator/v1/auth/test-secret.alice/triominos/v1/active-games`, () =>
          HttpResponse.json(games),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/alice/games")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(2);
      expect(res.body[0].id).toBe("game1");
      expect(res.body[1].status).toBe("gameover");
    });

    it("returns empty array when user has no games", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/coordinator/v1/auth/test-secret.alice/triominos/v1/active-games`, () =>
          HttpResponse.json([]),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/alice/games")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body).toEqual([]);
    });
  });

  describe("POST /api/users/:userId/games/:gameId/delete", () => {
    it("calls leave for all players sequentially", async () => {
      const players = ["alice", "bob"];
      const leaveCalls: string[] = [];

      mswServer.use(
        http.get(`${UPSTREAM}/coordinator/v1/auth/test-secret.alice/games/game1`, () =>
          HttpResponse.json({ id: "game1", players, status: "active" }),
        ),
        http.post(`${UPSTREAM}/coordinator/v1/auth/test-secret.alice/games/game1/leave`, () => {
          leaveCalls.push("alice");
          return HttpResponse.json({ ok: true });
        }),
        http.post(`${UPSTREAM}/coordinator/v1/auth/test-secret.bob/games/game1/leave`, () => {
          leaveCalls.push("bob");
          return HttpResponse.json({ ok: true });
        }),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .post("/admin/v1/api/users/alice/games/game1/delete")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(leaveCalls).toEqual(["alice", "bob"]);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results.every((r: { success: boolean }) => r.success)).toBe(true);
    });

    it("returns 207 when some players fail to leave", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/coordinator/v1/auth/test-secret.alice/games/game1`, () =>
          HttpResponse.json({ id: "game1", players: ["alice", "bob"], status: "active" }),
        ),
        http.post(`${UPSTREAM}/coordinator/v1/auth/test-secret.alice/games/game1/leave`, () =>
          HttpResponse.json({ ok: true }),
        ),
        http.post(`${UPSTREAM}/coordinator/v1/auth/test-secret.bob/games/game1/leave`, () =>
          HttpResponse.json({ error: "conflict" }, { status: 409 }),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .post("/admin/v1/api/users/alice/games/game1/delete")
        .set("Cookie", cookie);

      expect(res.status).toBe(207);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results[0].success).toBe(true);
      expect(res.body.results[1].success).toBe(false);
    });

    it("returns error when game fetch fails", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/coordinator/v1/auth/test-secret.alice/games/missing`, () =>
          HttpResponse.json({ error: "not found" }, { status: 404 }),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .post("/admin/v1/api/users/alice/games/missing/delete")
        .set("Cookie", cookie);

      expect(res.status).toBe(404);
    });
  });
});
