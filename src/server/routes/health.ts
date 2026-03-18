import os from "node:os";
import { Router } from "express";

interface HealthOptions {
  name: string;
  version: string;
  description: string;
}

export function createHealthRouter(options: HealthOptions): Router {
  const router = Router();
  const startDate = new Date().toISOString();

  router.get("/ping/:token", (req, res) => {
    res.send(`pong/${req.params.token}`);
  });

  router.get("/about", (_req, res) => {
    res.json({
      type: options.name,
      version: options.version,
      description: options.description,
      hostname: os.hostname(),
      startDate,
    });
  });

  return router;
}
