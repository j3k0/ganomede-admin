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
});
const pkg = { name: "admin", version: "2.0.0", description: "Test", api: "admin/v1" };

const mswServer = setupServer();
beforeAll(() => mswServer.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

function createTestApp() { return createApp({ config, pkg }); }

async function loginAndGetCookie(app: ReturnType<typeof createTestApp>) {
  const loginRes = await request(app)
    .post("/admin/v1/api/login")
    .send({ username: "admin", password: "secret" });
  return loginRes.headers["set-cookie"][0];
}

describe("vcurrency routes", () => {
  it("GET /items returns items with currencies", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret/products`, () =>
        HttpResponse.json([{ id: "sword", costs: { gold: 100 } }]),
      ),
    );
    const app = createTestApp();
    const cookie = await loginAndGetCookie(app);
    const res = await request(app).get("/admin/v1/api/items").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.currencies).toEqual(["gold", "silver"]);
  });

  it("POST /items/:id creates item with secret", async () => {
    mswServer.use(
      http.post(`${UPSTREAM}/virtualcurrency/v1/products`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        expect(body.secret).toBe("test-secret");
        return HttpResponse.json({ ok: true });
      }),
    );
    const app = createTestApp();
    const cookie = await loginAndGetCookie(app);
    const res = await request(app)
      .post("/admin/v1/api/items/sword")
      .set("Cookie", cookie)
      .send({ id: "sword", costs: { gold: 100 } });
    expect(res.status).toBe(200);
  });

  it("GET /packs returns packs array", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret/packs`, () =>
        HttpResponse.json([{ id: "pack1", currency: "gold", amount: 500 }]),
      ),
    );
    const app = createTestApp();
    const cookie = await loginAndGetCookie(app);
    const res = await request(app).get("/admin/v1/api/packs").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
