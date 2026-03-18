import { Router } from "express";
import { z } from "zod";
import type { Mailer } from "../mailer.js";

const sendEmailSchema = z.object({
  to: z.string().email(),
  subject: z.string().min(1),
  text: z.string().min(1),
  html: z.string().optional(),
});

export function createMailRouter(mailer: Mailer, _allowedFrom: string): Router {
  const router = Router();

  router.post("/send-email", async (req, res, next) => {
    if (!mailer.enabled) {
      res.status(503).json({ error: "Email service is not configured" });
      return;
    }

    const parsed = sendEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }

    try {
      await mailer.sendMail(parsed.data);
      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
