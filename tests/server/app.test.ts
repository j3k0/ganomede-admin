import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/server/app.js";
import { parseConfig } from "../../src/server/config.js";

const config = parseConfig({
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "secret",
  API_SECRET: "test",
  CURRENCY_CODES: "gold,silver",
  UPSTREAM_URL: "http://localhost:9999",
});

const pkg = { name: "admin", version: "2.0.0", description: "Test", api: "admin/v1" };

function createTestApp() {
  return createApp({ config, pkg });
}

describe("app integration", () => {
  it("GET /ping/:token returns pong", async () => {
    const res = await request(createTestApp()).get("/ping/test");
    expect(res.status).toBe(200);
    expect(res.text).toBe("pong/test");
  });

  it("GET /about returns service info", async () => {
    const res = await request(createTestApp()).get("/about");
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("admin");
  });

  it("GET / redirects to /admin/v1/web", async () => {
    const res = await request(createTestApp()).get("/");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/admin/v1/web");
  });

  it("GET /admin/v1/api/islogged returns 401 without auth", async () => {
    const res = await request(createTestApp()).get("/admin/v1/api/islogged");
    expect(res.status).toBe(401);
    expect(res.body.needAuthentication).toBe(true);
  });

  it("full auth flow: login -> islogged -> logout -> without cookie fails", async () => {
    const app = createTestApp();

    // Login
    const loginRes = await request(app)
      .post("/admin/v1/api/login")
      .send({ username: "admin", password: "secret" });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers["set-cookie"][0];

    // islogged succeeds
    const loggedRes = await request(app)
      .get("/admin/v1/api/islogged")
      .set("Cookie", cookie);
    expect(loggedRes.status).toBe(200);

    // Logout clears the cookie
    const logoutRes = await request(app)
      .post("/admin/v1/api/logout")
      .set("Cookie", cookie);
    expect(logoutRes.status).toBe(200);

    // Without cookie, islogged fails
    const failRes = await request(app)
      .get("/admin/v1/api/islogged");
    expect(failRes.status).toBe(401);
  });

  it("rate limits login attempts", async () => {
    const app = createTestApp();

    // Send 6 rapid login attempts (limit is 5/min)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/admin/v1/api/login")
        .send({ username: "admin", password: "wrong" });
    }

    const res = await request(app)
      .post("/admin/v1/api/login")
      .send({ username: "admin", password: "wrong" });
    expect(res.status).toBe(429);
  });
});
