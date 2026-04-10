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
  CURRENCY_CODES: "gold",
  UPSTREAM_URL: UPSTREAM,
});
const pkg = { name: "admin", version: "2.0.0", description: "Test", api: "admin/v1" };

const mswServer = setupServer();
beforeAll(() => mswServer.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

function createTestApp() { return createApp({ config, pkg }); }

async function auth(app: ReturnType<typeof createTestApp>) {
  const r = await request(app).post("/admin/v1/api/login").send({ username: "admin", password: "secret" });
  return r.headers["set-cookie"][0];
}

describe("data routes", () => {
  it("GET /data/docs returns document list", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/data/v1/docs`, () =>
        HttpResponse.json(["doc1", "doc2"]),
      ),
    );
    const app = createTestApp();
    const cookie = await auth(app);
    const res = await request(app).get("/admin/v1/api/data/docs").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(["doc1", "doc2"]);
  });

  it("GET /data/docs/:id returns single document", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/data/v1/docs/doc1`, () =>
        HttpResponse.json({ id: "doc1", content: { key: "value" } }),
      ),
    );
    const app = createTestApp();
    const cookie = await auth(app);
    const res = await request(app).get("/admin/v1/api/data/docs/doc1").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe("doc1");
  });

  it("POST /data/docs creates document with secret", async () => {
    mswServer.use(
      http.post(`${UPSTREAM}/data/v1/docs`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        expect(body.secret).toBe("test-secret");
        return HttpResponse.json({ ok: true });
      }),
    );
    const app = createTestApp();
    const cookie = await auth(app);
    const res = await request(app)
      .post("/admin/v1/api/data/docs")
      .set("Cookie", cookie)
      .send({ id: "new-doc", content: {} });
    expect(res.status).toBe(200);
  });
});
