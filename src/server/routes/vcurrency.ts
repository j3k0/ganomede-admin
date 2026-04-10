import { Router, type Request, type Response } from "express";
import type { Config } from "../config.js";
import { proxyToUpstream } from "../proxy.js";

interface VCurrencyRouterDeps {
  config: Config;
}

export function createVCurrencyRouter({ config }: VCurrencyRouterDeps): Router {
  const router = Router();

  function upstreamUrl(): string {
    if (!config.UPSTREAM_URL) throw new Error("UPSTREAM_URL is required");
    return config.UPSTREAM_URL;
  }

  // --- Items ---
  router.get("/items", async (_req: Request, res: Response) => {
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}/products?limit=500`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    // Wrap in {items, currencies} format
    const items = Array.isArray(result.data) ? result.data : [];
    res.json({ items, currencies: config.CURRENCY_CODES });
  });

  router.post("/items/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(base, `/virtualcurrency/v1/products`, {
      method: "POST",
      body,
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  router.put("/items/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(base, `/virtualcurrency/v1/products`, {
      method: "PUT",
      body,
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  // --- Packs ---
  router.get("/packs", async (_req: Request, res: Response) => {
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}/packs?limit=500`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.json(result.data);
  });

  router.post("/packs/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}/packs`,
      { method: "POST", body, timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.status(result.status).json(result.data);
  });

  router.put("/packs/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}/packs`,
      { method: "PUT", body, timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.status(result.status).json(result.data);
  });

  return router;
}
