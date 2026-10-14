import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { createApp } from "../../../src/server/app.js";
import { parseConfig } from "../../../src/server/config.js";

const UPSTREAM = "http://localhost:9999";
const SUSPECTS = `${UPSTREAM}/statistics/v1/admin/farming-suspects`;

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

async function login(app: ReturnType<typeof createApp>) {
  const res = await request(app).post("/admin/v1/api/login").send({ username: "admin", password: "secret" });
  return res.headers["set-cookie"][0];
}

describe("GET /api/farming-suspects", () => {
  it("requires an admin session", async () => {
    const app = createApp({ config, pkg });
    const res = await request(app).get("/admin/v1/api/farming-suspects");
    expect(res.status).toBe(401);
  });

  it("proxies to the statistics admin API with the secret in a header", async () => {
    const body = { scannedAt: 1790000000000, deviceScan: "ok", alerts: [] };
    let secret: string | null = null;
    let url = "";
    mswServer.use(
      http.get(SUSPECTS, ({ request }) => {
        secret = request.headers.get("x-api-secret");
        url = request.url;
        return HttpResponse.json(body);
      }),
    );
    const app = createApp({ config, pkg });
    const res = await request(app).get("/admin/v1/api/farming-suspects").set("Cookie", await login(app));
    expect(res.status).toBe(200);
    expect(res.body).toEqual(body);
    expect(secret).toBe("test-secret");
    expect(url).not.toContain("secret");
  });

  it("maps upstream 401 to 502 so the admin isn't logged out", async () => {
    mswServer.use(http.get(SUSPECTS, () => HttpResponse.json({}, { status: 401 })));
    const app = createApp({ config, pkg });
    const res = await request(app).get("/admin/v1/api/farming-suspects").set("Cookie", await login(app));
    expect(res.status).toBe(502);
  });

  it("explains a 404 from an older statistics server", async () => {
    mswServer.use(http.get(SUSPECTS, () => HttpResponse.json({}, { status: 404 })));
    const app = createApp({ config, pkg });
    const res = await request(app).get("/admin/v1/api/farming-suspects").set("Cookie", await login(app));
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not available/);
  });
});
