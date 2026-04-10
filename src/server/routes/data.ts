import { Router, type Request, type Response } from "express";
import type { Config } from "../config.js";
import { proxyToUpstream } from "../proxy.js";

interface DataRouterDeps {
  config: Config;
}

export function createDataRouter({ config }: DataRouterDeps): Router {
  const router = Router();

  function upstreamUrl(): string {
    if (!config.UPSTREAM_URL) throw new Error("UPSTREAM_URL is required");
    return config.UPSTREAM_URL;
  }

  // Bulk upsert — must be before /docs/:id to avoid matching "_bulk_upsert" as an ID
  router.post("/docs/_bulk_upsert", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(base, `/data/v1/docs/_bulk_upsert`, {
      method: "POST",
      body,
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  // List documents (with optional search query)
  router.get("/docs", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const query = req.query.q ? `?q=${encodeURIComponent(String(req.query.q))}` : "";
    const result = await proxyToUpstream(
      base,
      `/data/v1/docs${query}`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.status(result.status).json(result.data);
  });

  // Get single document
  router.get("/docs/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await proxyToUpstream(
      base,
      `/data/v1/docs/${encodeURIComponent(id)}`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.status(result.status).json(result.data);
  });

  // Create document
  router.post("/docs", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(base, `/data/v1/docs`, {
      method: "POST",
      body,
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  // Update document
  router.post("/docs/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(
      base,
      `/data/v1/docs/${encodeURIComponent(id)}`,
      { method: "POST", body, timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.status(result.status).json(result.data);
  });

  // Delete document
  router.delete("/docs/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const result = await proxyToUpstream(
      base,
      `/data/v1/docs/${encodeURIComponent(id)}`,
      {
        method: "DELETE",
        body: { secret: config.API_SECRET },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      },
    );
    res.status(result.status).json(result.data);
  });

  return router;
}
