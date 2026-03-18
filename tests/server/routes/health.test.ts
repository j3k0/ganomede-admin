import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createHealthRouter } from "../../../src/server/routes/health.js";

function createTestApp() {
  const app = express();
  app.use(createHealthRouter({ name: "admin", version: "2.0.0", description: "Admin panel" }));
  return app;
}

describe("health routes", () => {
  describe("GET /ping/:token", () => {
    it("responds with pong/{token}", async () => {
      const app = createTestApp();
      const res = await request(app).get("/ping/abc123");
      expect(res.status).toBe(200);
      expect(res.text).toBe("pong/abc123");
    });
  });

  describe("GET /about", () => {
    it("returns service info", async () => {
      const app = createTestApp();
      const res = await request(app).get("/about");
      expect(res.status).toBe(200);
      expect(res.body.type).toBe("admin");
      expect(res.body.version).toBe("2.0.0");
      expect(res.body.description).toBe("Admin panel");
      expect(res.body.hostname).toBeDefined();
      expect(res.body.startDate).toBeDefined();
    });
  });
});
