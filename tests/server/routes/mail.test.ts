import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createMailRouter } from "../../../src/server/routes/mail.js";
import type { Mailer } from "../../../src/server/mailer.js";

function createTestApp(mailer: Mailer) {
  const app = express();
  app.use(express.json());
  app.use(createMailRouter(mailer, "noreply@test.com"));
  return app;
}

function mockMailer(): Mailer & { sendMail: ReturnType<typeof vi.fn> } {
  return {
    enabled: true,
    sendMail: vi.fn().mockResolvedValue(undefined),
  };
}

describe("POST /send-email", () => {
  it("sends email with valid body", async () => {
    const mailer = mockMailer();
    const app = createTestApp(mailer);

    const res = await request(app).post("/send-email").send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mailer.sendMail).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });
  });

  it("rejects missing 'to' field", async () => {
    const mailer = mockMailer();
    const app = createTestApp(mailer);

    const res = await request(app).post("/send-email").send({
      subject: "Test",
      text: "Hello",
    });

    expect(res.status).toBe(400);
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("rejects invalid email address", async () => {
    const mailer = mockMailer();
    const app = createTestApp(mailer);

    const res = await request(app).post("/send-email").send({
      to: "not-an-email",
      subject: "Test",
      text: "Hello",
    });

    expect(res.status).toBe(400);
  });

  it("returns 503 when mailer is disabled", async () => {
    const mailer: Mailer = {
      enabled: false,
      async sendMail() {
        throw new Error("not configured");
      },
    };
    const app = createTestApp(mailer);

    const res = await request(app).post("/send-email").send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });

    expect(res.status).toBe(503);
  });
});
