import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Config } from "../config.js";
import { proxyToUpstream, type ProxyResult } from "../proxy.js";
import { GAME_TYPE } from "./users.js";
import { logger } from "../logger.js";

/**
 * Leaderboard ranking view/adjust (FOV-1545).
 *
 * Proxies to the triominos-server statistics admin API (FOV-1546, PR #95).
 * Both calls send the secret in the X-API-Secret header only.
 *
 *   GET  /statistics/v1/triominos/v1/admin/:username
 *     200 { username, level, rank, adjustments: [{ date, delta, requestedDelta,
 *           reason, by, previousLevel, newLevel }] }
 *         rank is 1-based, 0 = unranked (also for players with no games);
 *         date in seconds; delta is the applied one; adjustments oldest first
 *   POST /statistics/v1/triominos/v1/admin/:username/adjust
 *     body { delta, reason, by, expectedLevel }
 *     200 { level, rank }
 *     404 player has no games (nothing written)
 *     409 { code, message, level } expectedLevel mismatch (nothing written)
 *     503 stats worker held its lock > 40s (nothing written)
 *
 * The adjust call waits for the stats worker's lock, so it can take ~30s.
 */

const STATISTICS_PATH = `/statistics/v1/${GAME_TYPE}/admin`;

/** Above the server's 40s lock wait, so we see its 503 instead of timing out. */
const ADJUST_TIMEOUT_MS = 45_000;

/** Same bounds as the server (src/statistics/admin.ts). */
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
        error: "Points changed since the page was loaded. Nothing was changed: check the new value and try again.",
        upstream: result.data,
      });
      return;
    }
    if (result.status === 503) {
      res.status(503).json({ error: "Statistics worker is busy. Nothing was changed, try again." });
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
    // Audit trail of every attempt, including refused and unknown outcomes.
    const audit = { audit: "ranking-adjust", userId, ...parsed.data };
    let result: ProxyResult;
    try {
      result = await proxyToUpstream(
        upstreamUrl(),
        `${STATISTICS_PATH}/${encodeURIComponent(userId)}/adjust`,
        {
          method: "POST",
          headers: headers(),
          // Single shared admin login: "by" is the configured admin account,
          // never taken from the browser.
          body: { ...parsed.data, by: config.ADMIN_USERNAME },
          timeoutMs: ADJUST_TIMEOUT_MS,
        },
      );
    } catch (err) {
      logger.warn({ ...audit, err: (err as Error).name }, "ranking adjustment outcome unknown");
      // The server may still have applied it after we gave up.
      res.status(504).json({
        error: "No answer from the statistics service. The change may have been applied: check the history before retrying.",
      });
      return;
    }
    logger.info({ ...audit, status: result.status, result: result.data }, "ranking adjustment");
    send(res, result);
  });

  return router;
}
