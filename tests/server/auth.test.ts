import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import { createAuthModule } from "../../src/server/auth.js";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const auth = createAuthModule({
    username: "admin",
    password: "secret",
    isProduction: false,
    sessionTtlMs: 604_800_000,
  });

  // Mount auth routes
  app.use("/api", auth.router);

  // Protected route
  app.get("/api/protected", auth.validate, (_req, res) => {
    res.json({ success: true });
  });

  return { app, auth };
}

describe("auth", () => {
  describe("POST /api/login", () => {
    it("returns success and sets cookie on valid credentials", async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "secret" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"][0]).toMatch(/token=/);
      expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    });

    it("returns 401 on invalid credentials", async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 when username is missing", async () => {
      const { app } = createTestApp();
      const res = await request(app).post("/api/login").send({ password: "secret" });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/logout", () => {
    it("clears cookie and invalidates session", async () => {
      const { app } = createTestApp();

      // Login first
      const loginRes = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "secret" });
      const cookie = loginRes.headers["set-cookie"][0];

      // Logout
      const logoutRes = await request(app)
        .post("/api/logout")
        .set("Cookie", cookie);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toEqual({ success: true });

      // Token should no longer work
      const protectedRes = await request(app)
        .get("/api/protected")
        .set("Cookie", cookie);
      expect(protectedRes.status).toBe(401);
    });
  });

  describe("validate middleware", () => {
    it("allows requests with valid session token", async () => {
      const { app } = createTestApp();

      const loginRes = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "secret" });
      const cookie = loginRes.headers["set-cookie"][0];

      const res = await request(app)
        .get("/api/protected")
        .set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("rejects requests without cookie", async () => {
      const { app } = createTestApp();
      const res = await request(app).get("/api/protected");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        error: "Need authentication",
        needAuthentication: true,
      });
    });

    it("rejects requests with invalid token", async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .get("/api/protected")
        .set("Cookie", "token=invalid-token");
      expect(res.status).toBe(401);
    });
  });

  describe("session expiry", () => {
    it("rejects expired sessions", async () => {
      const app = express();
      app.use(express.json());
      app.use(cookieParser());

      const auth = createAuthModule({
        username: "admin",
        password: "secret",
        isProduction: false,
        sessionTtlMs: 1, // 1ms TTL — expires immediately
      });

      app.use("/api", auth.router);
      app.get("/api/protected", auth.validate, (_req, res) => {
        res.json({ success: true });
      });

      const loginRes = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "secret" });
      const cookie = loginRes.headers["set-cookie"][0];

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 10));

      const res = await request(app)
        .get("/api/protected")
        .set("Cookie", cookie);
      expect(res.status).toBe(401);
    });
  });
});
