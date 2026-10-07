import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Config } from "../config.js";
import { proxyToUpstream, type ProxyResult } from "../proxy.js";
import { GAME_TYPE } from "./users.js";
import { logger } from "../logger.js";

/**
 * Leaderboard ranking view/adjust (FOV-1545).
 *
 * Proxies to the triominos-server statistics admin API (FOV-1546, PR #95):
 *
 *   GET  /statistics/v1/triominos/v1/admin/:tag?secret=…
 *     200 { username, level, rank, adjustments: [{ date, delta, reason, previousLevel, newLevel }] }
 *         rank is 1-based, 0 = unranked; date in seconds; adjustments oldest first
 *   POST /statistics/v1/triominos/v1/admin/:tag/adjust   body { secret, delta, reason }
 *     200 { level, rank }
 *     404 player has no games
 *     503 stats worker held its lock > 40s, retry
 *
 * The adjust call waits for the stats worker's lock, so it can take ~30s.
 * The secret is in the GET query string because the server only reads it
 * from query/body; FOV-1548 tracks redacting it from the server's logs.
 */

const STATISTICS_PATH = `/statistics/v1/${GAME_TYPE}/admin`;

/** Above the server's 40s lock wait, so we see its 503 instead of timing out. */
const ADJUST_TIMEOUT_MS = 45_000;

/** Server allows 500 chars and no delta cap; the admin is stricter. */
export const MAX_DELTA = 100_000;
export const MAX_REASON_LENGTH = 200;

const adjustSchema = z.object({
  delta: z
    .number()
    .int()
    .refine((n) => n !== 0, "delta must not be zero")
    .refine((n) => Math.abs(n) <= MAX_DELTA, `|delta| must be at most ${MAX_DELTA}`),
  reason: z.string().trim().min(1, "reason is required").max(MAX_REASON_LENGTH),
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
      `${STATISTICS_PATH}/${encodeURIComponent(userId)}?secret=${encodeURIComponent(config.API_SECRET)}`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
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
    // Audit trail: the shared admin login means nothing upstream tells
    // support people apart, so keep a record of every attempt here too.
    const audit = { audit: "ranking-adjust", userId, ...parsed.data };
    let result: ProxyResult;
    try {
      result = await proxyToUpstream(
        upstreamUrl(),
        `${STATISTICS_PATH}/${encodeURIComponent(userId)}/adjust`,
        {
          method: "POST",
          body: { secret: config.API_SECRET, ...parsed.data },
          timeoutMs: ADJUST_TIMEOUT_MS,
        },
      );
    } catch (err) {
      logger.warn({ ...audit, err: (err as Error).name }, "ranking adjustment outcome unknown");
      // No idempotency upstream: the adjustment may still have been applied.
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
