import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { ZodError } from "zod";
import { errorHandler, UpstreamError, ApiError } from "../../src/server/errors.js";

function createTestApp(thrower: () => never) {
  const app = express();
  app.get("/test", (_req, _res) => thrower());
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("maps ZodError to 400", async () => {
    const app = createTestApp(() => {
      throw new ZodError([{ code: "custom", path: ["field"], message: "bad" }]);
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
  });

  it("maps UpstreamError to 502", async () => {
    const app = createTestApp(() => {
      throw new UpstreamError(500, { message: "upstream down" });
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(502);
  });

  it("maps ApiError to its status code", async () => {
    const app = createTestApp(() => {
      throw new ApiError(403, "Forbidden");
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("maps unknown errors to 500", async () => {
    const app = createTestApp(() => {
      throw new Error("oops");
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
