import { Router, type Request, type Response } from "express";
import type { Config } from "../config.js";
import { proxyToUpstream } from "../proxy.js";

/**
 * Latest farming-detection scan (FOV-1786).
 *
 * Proxies to the triominos-server statistics admin API (FOV-1740, PR #112):
 *
 *   GET /statistics/v1/admin/farming-suspects   (X-API-Secret header)
 *     200 { scannedAt, deviceScan, alerts: [{ type, details }] }
 *         scannedAt: epoch ms, null before the first scan (deviceScan null too)
 *         deviceScan: "ok" | "failed" | "disabled"
 *         win-rate-outlier details: { winner, loser, games, wins, winRate }
 *         device-cluster details: { device, users, userIds (capped at 50) }
 */
export function createFarmingRouter({ config }: { config: Config }): Router {
  const router = Router();

  router.get("/farming-suspects", async (_req: Request, res: Response) => {
    if (!config.UPSTREAM_URL) throw new Error("UPSTREAM_URL is required");
    const result = await proxyToUpstream(
      config.UPSTREAM_URL,
      "/statistics/v1/admin/farming-suspects",
      {
        method: "GET",
        headers: { "X-API-Secret": config.API_SECRET },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS, redactSecret: config.API_SECRET,
      },
    );
    // Upstream 401 must not reach the browser as 401: the client treats it as
    // "admin session expired" and redirects to login.
    if (result.status === 401 || result.status === 403) {
      res.status(502).json({ error: "Statistics service rejected the admin API secret" });
      return;
    }
    if (result.status === 404) {
      res.status(404).json({ error: "Farming suspects not available (statistics server too old)" });
      return;
    }
    res.status(result.status).json(result.data ?? {});
  });

  return router;
}
