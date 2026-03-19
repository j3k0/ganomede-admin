import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Config } from "../config.js";
import { proxyToUpstream } from "../proxy.js";

interface UsersRouterDeps {
  config: Config;
}

/** Extract a single string param (Express 5 params can be string | string[]). */
function param(req: Request, name: string): string {
  const v = req.params[name];
  return Array.isArray(v) ? v[0] : v;
}

export function createUsersRouter({ config }: UsersRouterDeps): Router {
  const router = Router();

  function upstreamUrl(): string {
    if (!config.UPSTREAM_URL) throw new Error("UPSTREAM_URL is required");
    return config.UPSTREAM_URL;
  }

  /** Directory service may live on a different host (e.g. account.ggs.ovh). */
  function directoryUrl(): string {
    return config.DIRECTORY_URL ?? upstreamUrl();
  }

  function secretHeader(): Record<string, string> {
    return { "X-API-Secret": config.API_SECRET };
  }

  // --- Search ---
  router.get("/search/:query", async (req: Request, res: Response) => {
    const query = param(req, "query");
    const dirBase = directoryUrl();
    const secret = config.API_SECRET;

    // Try all three resolution methods in parallel
    const [byId, byEmail, byTag] = await Promise.allSettled([
      proxyToUpstream(dirBase, `/directory/v1/users/id/${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      }),
      proxyToUpstream(dirBase, `/directory/v1/users/alias/email/${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      }),
      proxyToUpstream(dirBase, `/directory/v1/users/alias/tag/${encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9]/g, ""))}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      }),
    ]);

    const results: Array<{ found: boolean; method: string; userId?: string }> = [];
    const matchingIds: string[] = [];

    function processResult(
      settled: PromiseSettledResult<{ status: number; data: unknown }>,
      method: string,
    ) {
      if (settled.status === "fulfilled" && settled.value.status === 200) {
        const data = settled.value.data as Record<string, unknown>;
        const userId = (data.id ?? data.userId ?? query) as string;
        results.push({ found: true, method, userId });
        if (!matchingIds.includes(userId)) matchingIds.push(userId);
      } else {
        results.push({ found: false, method });
      }
    }

    processResult(byId, "byId");
    processResult(byEmail, "byEmail");
    processResult(byTag, "byTag");

    res.json({ query, results, matchingIds });
  });

  // --- Reports & Blocks ---
  router.get("/reports-blocks/:userId", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/users/v1/admin/blocks/${encodeURIComponent(userId)}`,
      {
        method: "GET",
        headers: secretHeader(),
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      },
    );
    res.status(result.status).json(result.data);
  });

  // --- Highly Reported (must be BEFORE /:userId to avoid matching "highly" as userId) ---
  router.get("/highly/reported", async (_req: Request, res: Response) => {
    const base = upstreamUrl();
    const result = await proxyToUpstream(base, `/users/v1/admin/reported-users`, {
      method: "GET",
      headers: secretHeader(),
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  // --- Chat ---
  router.get("/chat/:username1/:username2", async (req: Request, res: Response) => {
    const username1 = param(req, "username1");
    const username2 = param(req, "username2");
    const sorted = [username1, username2].sort();
    const prefix = config.CHAT_ROOM_PREFIX;
    const roomId = prefix ? `${prefix}/${sorted[0]}/${sorted[1]}` : `${sorted[0]}/${sorted[1]}`;
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/chat/v1/auth/${config.API_SECRET}/rooms/${encodeURIComponent(roomId)}`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    if (result.status === 404) {
      res.json({ users: sorted, messages: [] });
      return;
    }
    res.status(result.status).json(result.data);
  });

  // --- Profile ---
  router.get("/:userId", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const base = upstreamUrl();
    const secret = config.API_SECRET;
    const currencies = config.CURRENCY_CODES;

    // Fetch all profile data in parallel (some may fail -- that's OK)
    const [balanceRes, transactionsRes, banRes, avatarRes, metadataRes, directoryRes] =
      await Promise.allSettled([
        // Balance
        proxyToUpstream(
          base,
          `/virtualcurrency/v1/auth/${secret}.${encodeURIComponent(userId)}/coins/${currencies.join(",")}/count`,
          { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
        ),
        // Transactions
        proxyToUpstream(
          base,
          `/virtualcurrency/v1/auth/${secret}.${encodeURIComponent(userId)}/transactions?reasons=reward,purchase&limit=100000`,
          { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
        ),
        // Ban info
        proxyToUpstream(base, `/users/v1/banned-users/${encodeURIComponent(userId)}`, {
          method: "GET",
          headers: secretHeader(),
          timeoutMs: config.UPSTREAM_TIMEOUT_MS,
        }),
        // Avatar (binary)
        proxyToUpstream(base, `/avatars/v1/${encodeURIComponent(userId)}/64.png`, {
          method: "GET",
          responseType: "buffer",
          timeoutMs: config.UPSTREAM_TIMEOUT_MS,
        }),
        // Metadata
        config.USER_METADATA_LIST.length > 0
          ? proxyToUpstream(
              base,
              `/usermeta/v1/${encodeURIComponent(userId)}/${config.USER_METADATA_LIST.join(",")}?secret=${secret}`,
              { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
            )
          : Promise.resolve({ status: 200, data: {} }),
        // Directory info
        proxyToUpstream(directoryUrl(), `/directory/v1/users/id/${encodeURIComponent(userId)}?secret=${secret}`, {
          method: "GET",
          headers: { Authorization: `Bearer ${secret}` },
          timeoutMs: config.UPSTREAM_TIMEOUT_MS,
        }),
      ]);

    function extract<T>(result: PromiseSettledResult<{ status: number; data: unknown }>, fallback: T): T {
      if (result.status === "fulfilled" && result.value.status >= 200 && result.value.status < 300) {
        return result.value.data as T;
      }
      return fallback;
    }

    // Avatar: convert buffer to data URI
    let avatar: string | null = null;
    if (avatarRes.status === "fulfilled" && avatarRes.value.status === 200 && Buffer.isBuffer(avatarRes.value.data)) {
      avatar = `data:image/png;base64,${(avatarRes.value.data as Buffer).toString("base64")}`;
    }

    res.json({
      userId,
      balance: extract(balanceRes, []),
      transactions: extract(transactionsRes, []),
      banInfo: extract(banRes, { exists: false }),
      avatar,
      metadata: extract(metadataRes, {}),
      directory: extract(directoryRes, null),
    });
  });

  // --- Metadata ---
  router.get("/:userId/usermeta", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const base = upstreamUrl();
    const fields = config.USER_METADATA_LIST;
    if (fields.length === 0) {
      res.json([]);
      return;
    }
    const result = await proxyToUpstream(
      base,
      `/usermeta/v1/${encodeURIComponent(userId)}/${fields.join(",")}?secret=${config.API_SECRET}`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    // Transform object to array: [{id: 'key', value: 'val'}, ...]
    const data = result.data as Record<string, unknown>;
    const entries = Object.entries(data).map(([id, value]) => ({ id, value }));
    res.json(entries);
  });

  router.put("/:userId/usermeta/:key", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const key = param(req, "key");
    const { value } = req.body;
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/usermeta/v1/${encodeURIComponent(userId)}/${key}?secret=${config.API_SECRET}`,
      { method: "POST", body: { value }, timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.status(result.status).json(result.data);
  });

  // --- Ban/Unban ---
  router.post("/:userId/ban", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const base = upstreamUrl();
    const result = await proxyToUpstream(base, `/users/v1/banned-users`, {
      method: "POST",
      body: { apiSecret: config.API_SECRET, username: userId },
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  router.post("/:userId/unban", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/users/v1/banned-users/${encodeURIComponent(userId)}`,
      {
        method: "DELETE",
        body: { apiSecret: config.API_SECRET },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      },
    );
    res.status(result.status).json(result.data);
  });

  // --- Rewards ---
  const rewardSchema = z.object({
    amount: z.number().int().positive(),
    currency: z.string().min(1),
  });

  router.post("/:userId/rewards", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const parsed = rewardSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}.${encodeURIComponent(userId)}/rewards`,
      {
        method: "POST",
        body: { amount: parsed.data.amount, currency: parsed.data.currency },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      },
    );
    res.status(result.status).json(result.data);
  });

  // --- Password Reset ---
  const passwordSchema = z.object({ newPassword: z.string().min(1) });

  router.post("/:userId/password-reset", async (req: Request, res: Response) => {
    const userId = param(req, "userId");
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }
    const result = await proxyToUpstream(
      directoryUrl(),
      `/directory/v1/users/id/${encodeURIComponent(userId)}`,
      {
        method: "POST",
        body: { secret: config.API_SECRET, password: parsed.data.newPassword },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      },
    );
    res.status(result.status).json(result.data);
  });

  return router;
}
