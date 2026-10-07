import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Config } from "../config.js";
import { proxyToUpstream, type ProxyResult } from "../proxy.js";
import { GAME_TYPE } from "./users.js";

/**
 * Leaderboard ranking view/adjust (FOV-1545).
 *
 * Proxies to the triominos-server statistics admin API (FOV-1546). The
 * upstream contract lives only in this file so it can follow FOV-1546 if it
 * changes:
 *
 *   GET  /statistics/v1/triominos/v1/admin/:username          (X-API-Secret)
 *     200 { username, level, rank, adjustments: [{ date, delta, reason, by, newLevel }] }
 *         rank is 1-based, 0 = unranked
 *   POST /statistics/v1/triominos/v1/admin/:username/adjust   (X-API-Secret)
 *     body { delta, reason, by, expectedLevel }
 *     200 { level, rank }  applied
 *     202                  queued, applied by the fetcher within one step
 *     409 { level }        expectedLevel no longer matches (concurrent game or double submit)
 */

const STATISTICS_PATH = `/statistics/v1/${GAME_TYPE}/admin`;

/** Keep in sync with the server-side bounds on FOV-1546. */
export const MAX_DELTA = 100_000;
export const MAX_REASON_LENGTH = 200;

const adjustSchema = z.object({
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "delta must not be zero")
    .refine((n) => Math.abs(n) <= MAX_DELTA, `|delta| must be at most ${MAX_DELTA}`),
  reason: z.string().trim().min(1, "reason is required").max(MAX_REASON_LENGTH),
  expectedLevel: z.number().int().min(0),
});

interface RankingRouterDeps {
  config: Config;
}

function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export function createRankingRouter({ config }: RankingRouterDeps): Router {
  const router = Router();

  function upstreamUrl(): string {
    if (!config.UPSTREAM_URL) throw new Error("UPSTREAM_URL is required");
    return config.UPSTREAM_URL;
  }

  const headers = () => ({ "X-API-Secret": config.API_SECRET });

  /**
   * Upstream auth failures must not reach the browser as 401: the client
   * treats 401 as "admin session expired" and redirects to login.
   */
  function send(res: Response, result: ProxyResult) {
    if (result.status === 401 || result.status === 403) {
      res.status(502).json({ error: "Statistics service rejected the admin API secret" });
      return;
    }
    if (result.status === 404) {
      res.status(404).json({ error: "Player has no ranking data" });
      return;
    }
    if (result.status === 409) {
      res.status(409).json({
        error: "Points changed since the page was loaded. Check the new value and try again.",
        upstream: result.data,
      });
      return;
    }
    res.status(result.status).json(result.data ?? {});
  }

  router.get("/:userId/ranking", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const result = await proxyToUpstream(
      upstreamUrl(),
      `${STATISTICS_PATH}/${encodeURIComponent(userId)}`,
      { method: "GET", headers: headers(), timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    send(res, result);
  });

  router.post("/:userId/ranking/adjust", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const parsed = adjustSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }
    const result = await proxyToUpstream(
      upstreamUrl(),
      `${STATISTICS_PATH}/${encodeURIComponent(userId)}/adjust`,
      {
        method: "POST",
        headers: headers(),
        // Single shared admin login: "by" is the configured admin account,
        // never taken from the browser.
        body: { ...parsed.data, by: config.ADMIN_USERNAME },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      },
    );
    send(res, result);
  });

  return router;
}
