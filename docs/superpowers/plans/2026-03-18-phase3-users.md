# Phase 3: Core Pages — Users — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the complete Users feature: backend proxy routes for search, profile, actions, and chat; frontend pages for search, profile, user actions, transactions, metadata editing, reports/blocks, and email sending.

**Architecture:** Backend routes in `src/server/routes/users.ts` proxy to upstream triominos-server services. Frontend uses TanStack Query hooks in `src/client/lib/queries/users.ts` calling the backend API. Pages are split into focused components in `src/client/pages/users/`.

**Tech Stack:** Express 5 routes, native fetch proxy, React 19, TanStack Query 5, Tailwind CSS 4, sonner toasts, date-fns

**Spec:** `docs/superpowers/specs/2026-03-17-modernization-design.md` — Phase 3

---

## File Map

### Backend
| File | Responsibility |
|------|---------------|
| `src/server/routes/users.ts` | All user API routes: search, profile, ban, unban, rewards, password reset, metadata, reports-blocks, chat |
| `tests/server/routes/users.test.ts` | User route integration tests with MSW |

### Frontend
| File | Responsibility |
|------|---------------|
| `src/client/lib/queries/users.ts` | TanStack Query hooks: useUserSearch, useUserProfile, useBan, useAward, etc. |
| `src/client/lib/utils.ts` | Shared utilities: date formatting, password generator |
| `src/client/pages/users/UserSearch.tsx` | Search form + results list |
| `src/client/pages/users/UserProfile.tsx` | Profile layout: avatar, header, ban status, actions, balance, transactions, metadata, reports |
| `src/client/pages/users/Transactions.tsx` | Transaction table with currency grouping and running balance |
| `src/client/pages/users/MetadataEditor.tsx` | View/edit user metadata fields |
| `src/client/pages/users/ReportsBlocks.tsx` | Reports and blocks display with chat links |
| `src/client/pages/users/EmailDialog.tsx` | Multi-step email sending flow |
| `src/client/pages/Reports.tsx` | Most-reported users page |
| `src/client/pages/Chat.tsx` | Chat history viewer |
| `tests/client/pages/users/UserSearch.test.tsx` | Search flow test |

---

## Task 1: Utility Functions

**Files:**
- Create: `src/client/lib/utils.ts`

- [ ] **Step 1: Implement utilities**

`src/client/lib/utils.ts`:
```typescript
import { format, formatDistanceToNow } from "date-fns";

export function formatDate(date: string | number | Date): string {
  return format(new Date(date), "yyyy-MM-dd HH:mm");
}

export function formatDateRelative(date: string | number | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function passwordSuggestion(): string {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  let pw = "";
  for (let i = 0; i < 10; i++) pw += letters[Math.floor(Math.random() * letters.length)];
  for (let i = 0; i < 2; i++) pw += digits[Math.floor(Math.random() * digits.length)];
  return pw;
}

/**
 * Strip common prefixes from item/pack identifiers for display.
 */
export function stripPrefix(value: string, prefix = "com.triominos."): string {
  return value.startsWith(prefix) ? value.slice(prefix.length) : value;
}

/**
 * Group array items by a key function.
 */
export function groupBy<T>(items: T[], keyFn: (item: T) => string): Record<string, T[]> {
  const result: Record<string, T[]> = {};
  for (const item of items) {
    const key = keyFn(item);
    (result[key] ??= []).push(item);
  }
  return result;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/client/lib/utils.ts
git commit -m "feat: add shared utility functions (date, password, groupBy)"
```

---

## Task 2: Backend User Routes

**Files:**
- Create: `src/server/routes/users.ts`
- Modify: `src/server/app.ts`

This is the biggest backend task — all user-related proxy routes.

- [ ] **Step 1: Implement users route**

`src/server/routes/users.ts`:
```typescript
import { Router, type Request, type Response } from "express";
import { z } from "zod";
import type { Config } from "../config.js";
import { proxyToUpstream } from "../proxy.js";
import { logger } from "../logger.js";

interface UsersRouterDeps {
  config: Config;
}

export function createUsersRouter({ config }: UsersRouterDeps): Router {
  const router = Router();

  function upstreamUrl(): string {
    if (!config.UPSTREAM_URL) throw new Error("UPSTREAM_URL is required");
    return config.UPSTREAM_URL;
  }

  function secretHeader(): Record<string, string> {
    return { "X-API-Secret": config.API_SECRET };
  }

  // --- Search ---
  router.get("/search/:query", async (req: Request, res: Response) => {
    const query = req.params.query;
    const base = upstreamUrl();
    const secret = config.API_SECRET;

    // Try all three resolution methods in parallel
    const [byId, byEmail, byTag] = await Promise.allSettled([
      proxyToUpstream(base, `/directory/v1/users/id/${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      }),
      proxyToUpstream(base, `/directory/v1/users/alias/email/${encodeURIComponent(query)}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${secret}` },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      }),
      proxyToUpstream(base, `/directory/v1/users/alias/tag/${encodeURIComponent(query.toLowerCase().replace(/[^a-z0-9]/g, ""))}`, {
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

  // --- Profile ---
  router.get("/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;
    const base = upstreamUrl();
    const secret = config.API_SECRET;
    const currencies = config.CURRENCY_CODES;

    // Fetch all profile data in parallel (some may fail — that's OK)
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
        proxyToUpstream(base, `/directory/v1/users/id/${encodeURIComponent(userId)}?secret=${secret}`, {
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
    const { userId } = req.params;
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
    const { userId, key } = req.params;
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
    const { userId } = req.params;
    const base = upstreamUrl();
    const result = await proxyToUpstream(base, `/users/v1/banned-users`, {
      method: "POST",
      body: { apiSecret: config.API_SECRET, username: userId },
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  router.post("/:userId/unban", async (req: Request, res: Response) => {
    const { userId } = req.params;
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
    const { userId } = req.params;
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
    const { userId } = req.params;
    const parsed = passwordSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Validation error", details: parsed.error.issues });
      return;
    }
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/directory/v1/users/id/${encodeURIComponent(userId)}`,
      {
        method: "POST",
        body: { secret: config.API_SECRET, password: parsed.data.newPassword },
        timeoutMs: config.UPSTREAM_TIMEOUT_MS,
      },
    );
    res.status(result.status).json(result.data);
  });

  // --- Reports & Blocks ---
  router.get("/reports-blocks/:userId", async (req: Request, res: Response) => {
    const { userId } = req.params;
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
    const { username1, username2 } = req.params;
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

  return router;
}
```

- [ ] **Step 2: Mount users router in app.ts**

In `src/server/app.ts`, add import and mount after the mail router:

```typescript
import { createUsersRouter } from "./routes/users.js";
```

And in the `createApp` function, after the mailer mount and before the error handler:

```typescript
  // --- Users ---
  app.use(`${apiRoot}/users`, createUsersRouter({ config }));
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/server/routes/users.ts src/server/app.ts
git commit -m "feat: add user API routes (search, profile, actions, chat)"
```

---

## Task 3: Backend User Route Tests

**Files:**
- Create: `tests/server/routes/users.test.ts`

- [ ] **Step 1: Write user route tests**

`tests/server/routes/users.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import request from "supertest";
import { createApp } from "../../../src/server/app.js";
import { parseConfig } from "../../../src/server/config.js";

const UPSTREAM = "http://localhost:9999";

const config = parseConfig({
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "secret",
  API_SECRET: "test-secret",
  CURRENCY_CODES: "gold,silver",
  UPSTREAM_URL: UPSTREAM,
  CHAT_ROOM_PREFIX: "triominos/v1",
});

const pkg = { name: "admin", version: "2.0.0", description: "Test", api: "admin/v1" };

const mswServer = setupServer();
beforeAll(() => mswServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

function createTestApp() {
  return createApp({ config, pkg });
}

async function loginAndGetCookie(app: ReturnType<typeof createTestApp>) {
  const loginRes = await request(app)
    .post("/admin/v1/api/login")
    .send({ username: "admin", password: "secret" });
  return loginRes.headers["set-cookie"][0];
}

describe("user routes", () => {
  describe("GET /api/users/search/:query", () => {
    it("searches by id, email, and tag in parallel", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/directory/v1/users/id/alice`, () =>
          HttpResponse.json({ id: "alice", aliases: {} }),
        ),
        http.get(`${UPSTREAM}/directory/v1/users/alias/email/alice`, () =>
          HttpResponse.json({}, { status: 404 }),
        ),
        http.get(`${UPSTREAM}/directory/v1/users/alias/tag/alice`, () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/search/alice")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.query).toBe("alice");
      expect(res.body.matchingIds).toContain("alice");
      expect(res.body.results).toHaveLength(3);
    });
  });

  describe("POST /api/users/:userId/rewards", () => {
    it("awards currency to user", async () => {
      mswServer.use(
        http.post(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret.alice/rewards`, () =>
          HttpResponse.json({ ok: true }),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .post("/admin/v1/api/users/alice/rewards")
        .set("Cookie", cookie)
        .send({ amount: 100, currency: "gold" });

      expect(res.status).toBe(200);
    });

    it("rejects invalid reward amount", async () => {
      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .post("/admin/v1/api/users/alice/rewards")
        .set("Cookie", cookie)
        .send({ amount: -1, currency: "gold" });

      expect(res.status).toBe(400);
    });
  });

  describe("GET /api/users/chat/:u1/:u2", () => {
    it("sorts usernames and fetches chat room", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/chat/v1/auth/test-secret/rooms/*`, ({ request }) => {
          const url = new URL(request.url);
          expect(decodeURIComponent(url.pathname)).toContain("triominos/v1/alice/bob");
          return HttpResponse.json({ users: ["alice", "bob"], messages: [{ from: "alice", message: "hi" }] });
        }),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/chat/bob/alice")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.messages).toHaveLength(1);
    });

    it("returns empty messages for non-existent chat room", async () => {
      mswServer.use(
        http.get(`${UPSTREAM}/chat/v1/auth/test-secret/rooms/*`, () =>
          HttpResponse.json({}, { status: 404 }),
        ),
      );

      const app = createTestApp();
      const cookie = await loginAndGetCookie(app);

      const res = await request(app)
        .get("/admin/v1/api/users/chat/alice/bob")
        .set("Cookie", cookie);

      expect(res.status).toBe(200);
      expect(res.body.messages).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/server/routes/users.test.ts
```

Expected: All tests pass.

- [ ] **Step 3: Commit**

```bash
git add tests/server/routes/users.test.ts
git commit -m "test: add user route tests (search, rewards, chat)"
```

---

## Task 4: TanStack Query Hooks

**Files:**
- Create: `src/client/lib/queries/users.ts`

- [ ] **Step 1: Implement query hooks**

`src/client/lib/queries/users.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

// --- Types ---
export interface SearchResult {
  query: string;
  results: Array<{ found: boolean; method: string; userId?: string }>;
  matchingIds: string[];
}

export interface UserProfile {
  userId: string;
  balance: Array<{ currency: string; count: number }>;
  transactions: Transaction[];
  banInfo: { exists: boolean; createdAt?: string };
  avatar: string | null;
  metadata: Record<string, unknown>;
  directory: { id: string; aliases: Record<string, string> } | null;
}

export interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  currency: string;
  reason: string;
  data: Record<string, unknown>;
  balance?: number;
}

export interface ReportsBlocks {
  blockedBy: Array<{ username: string; on: string }>;
  blocks: Array<{ username: string; on: string }>;
  reportedBy: Array<{ username: string; on: string }>;
  reports: Array<{ username: string; on: string }>;
}

export interface ReportedUser {
  target: string;
  total: number;
}

export interface ChatRoom {
  users: string[];
  messages: Array<{ from: string; timestamp: string; type: string; message: string }>;
}

// --- Query Keys ---
export const userKeys = {
  all: ["users"] as const,
  search: (query: string) => [...userKeys.all, "search", query] as const,
  detail: (userId: string) => [...userKeys.all, userId] as const,
  reportsBlocks: (userId: string) => [...userKeys.all, userId, "reports-blocks"] as const,
  reported: () => [...userKeys.all, "reported"] as const,
  chat: (u1: string, u2: string) => [...userKeys.all, "chat", u1, u2] as const,
  metadata: (userId: string) => [...userKeys.all, userId, "metadata"] as const,
};

// --- Queries ---
export function useUserSearch(query: string) {
  return useQuery({
    queryKey: userKeys.search(query),
    queryFn: () => api.get<SearchResult>(`/users/search/${encodeURIComponent(query)}`),
    enabled: !!query,
  });
}

export function useUserProfile(userId: string) {
  return useQuery({
    queryKey: userKeys.detail(userId),
    queryFn: () => api.get<UserProfile>(`/users/${encodeURIComponent(userId)}`),
    enabled: !!userId,
  });
}

export function useReportsBlocks(userId: string) {
  return useQuery({
    queryKey: userKeys.reportsBlocks(userId),
    queryFn: () => api.get<ReportsBlocks>(`/users/reports-blocks/${encodeURIComponent(userId)}`),
    enabled: !!userId,
  });
}

export function useHighlyReported() {
  return useQuery({
    queryKey: userKeys.reported(),
    queryFn: () => api.get<ReportedUser[]>("/users/highly/reported"),
  });
}

export function useChatRoom(username1: string, username2: string) {
  return useQuery({
    queryKey: userKeys.chat(username1, username2),
    queryFn: () =>
      api.get<ChatRoom>(`/users/chat/${encodeURIComponent(username1)}/${encodeURIComponent(username2)}`),
    enabled: !!username1 && !!username2,
  });
}

export function useUserMetadata(userId: string) {
  return useQuery({
    queryKey: userKeys.metadata(userId),
    queryFn: () => api.get<Array<{ id: string; value: unknown }>>(`/users/${encodeURIComponent(userId)}/usermeta`),
    enabled: !!userId,
  });
}

// --- Mutations ---
export function useAwardCurrency(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { amount: number; currency: string }) =>
      api.post(`/users/${encodeURIComponent(userId)}/rewards`, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useBan(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/users/${encodeURIComponent(userId)}/ban`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useUnban(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.post(`/users/${encodeURIComponent(userId)}/unban`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function usePasswordReset(userId: string) {
  return useMutation({
    mutationFn: (data: { newPassword: string }) =>
      api.post(`/users/${encodeURIComponent(userId)}/password-reset`, data),
  });
}

export function useUpdateMetadata(userId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { key: string; value: string }) =>
      api.put(`/users/${encodeURIComponent(userId)}/usermeta/${data.key}`, { value: data.value }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: userKeys.metadata(userId) });
      qc.invalidateQueries({ queryKey: userKeys.detail(userId) });
    },
  });
}

export function useSendEmail() {
  return useMutation({
    mutationFn: (data: { to: string; subject: string; text: string; html?: string }) =>
      api.post("/send-email", data),
  });
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git add src/client/lib/queries/users.ts
git commit -m "feat: add TanStack Query hooks for users"
```

---

## Task 5: User Search Page

**Files:**
- Create: `src/client/pages/users/UserSearch.tsx`
- Modify: `src/client/router.tsx`

- [ ] **Step 1: Implement UserSearch**

`src/client/pages/users/UserSearch.tsx`:
```tsx
import { useState } from "react";
import { useNavigate, useParams, Outlet } from "react-router";
import { useUserSearch } from "../../lib/queries/users.js";

export function UserSearch() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [input, setInput] = useState(username ?? "");
  const [searchQuery, setSearchQuery] = useState(username ?? "");
  const { data, isLoading, error } = useUserSearch(searchQuery);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      setSearchQuery(input.trim());
    }
  }

  // If there's a single matching ID, auto-navigate to profile
  const singleMatch =
    data?.matchingIds.length === 1 ? data.matchingIds[0] : null;

  // If viewing a profile (has :username param), show Outlet
  if (username) {
    return (
      <div>
        <button
          onClick={() => navigate("/admin/v1/web/users")}
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          &larr; Back to search
        </button>
        <Outlet />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">User Search</h1>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Username, email, or user ID"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Find
        </button>
      </form>

      {isLoading && <p className="text-gray-500">Searching...</p>}

      {error && (
        <p className="text-red-600">
          Error: {error instanceof Error ? error.message : "Search failed"}
        </p>
      )}

      {data && !isLoading && (
        <div>
          {data.matchingIds.length === 0 && (
            <p className="text-gray-500">No users found for &quot;{data.query}&quot;</p>
          )}

          {singleMatch && (
            <div className="rounded border border-green-200 bg-green-50 p-4">
              <p className="font-medium">
                Found:{" "}
                <button
                  onClick={() => navigate(`/admin/v1/web/users/${singleMatch}`)}
                  className="text-blue-600 hover:underline"
                >
                  {singleMatch}
                </button>
              </p>
              <p className="mt-1 text-sm text-gray-500">
                Matched by: {data.results.filter((r) => r.found).map((r) => r.method).join(", ")}
              </p>
            </div>
          )}

          {data.matchingIds.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">Multiple matches found:</p>
              {data.matchingIds.map((id) => (
                <button
                  key={id}
                  onClick={() => navigate(`/admin/v1/web/users/${id}`)}
                  className="block w-full rounded border border-gray-200 p-3 text-left hover:bg-gray-50"
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update router to use UserSearch + UserProfile**

Update `src/client/router.tsx` to import `UserSearch` and use it instead of the placeholder:

Replace the users routes with:
```tsx
{ path: "users", element: <UserSearch />, children: [
  { path: ":username", element: <UserProfile /> },
] },
```

Import `UserSearch` and `UserProfile` (UserProfile can be a Placeholder for now):
```tsx
import { UserSearch } from "./pages/users/UserSearch.js";
// UserProfile will be created in Task 6
```

For now, create a minimal `UserProfile` export in the same task or use Placeholder.

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/client/pages/users/UserSearch.tsx src/client/router.tsx
git commit -m "feat: add user search page with auto-navigation"
```

---

## Task 6: User Profile Page

**Files:**
- Create: `src/client/pages/users/UserProfile.tsx`
- Create: `src/client/pages/users/Transactions.tsx`

- [ ] **Step 1: Implement Transactions component**

`src/client/pages/users/Transactions.tsx`:
```tsx
import { useState } from "react";
import { groupBy, stripPrefix, formatDate } from "../../lib/utils.js";
import type { Transaction } from "../../lib/queries/users.js";

interface TransactionsProps {
  transactions: Transaction[];
}

function getItemName(tx: Transaction): string {
  const data = tx.data ?? {};
  const raw = (data.packId ?? data.itemId ?? data.rewardId ?? "") as string;
  return stripPrefix(raw);
}

function getReason(tx: Transaction): string {
  if (tx.data?.from === "admin") return "award";
  return tx.reason ?? "unknown";
}

export function Transactions({ transactions }: TransactionsProps) {
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  if (transactions.length === 0) {
    return <p className="text-sm text-gray-500">No transactions</p>;
  }

  const grouped = groupBy(transactions, (tx) => tx.currency);

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([currency, txs]) => {
        // Sort ascending by timestamp, compute running balance
        const sorted = [...txs].sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
        );
        let runningBalance = 0;
        const withBalance = sorted.map((tx) => {
          runningBalance += tx.amount;
          return { ...tx, runningBalance };
        });
        // Display latest first
        withBalance.reverse();

        return (
          <div key={currency}>
            <h4 className="mb-2 text-sm font-semibold uppercase text-gray-500">
              {stripPrefix(currency)}
            </h4>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-1">Date</th>
                  <th className="pb-1">Item</th>
                  <th className="pb-1">Reason</th>
                  <th className="pb-1 text-right">Amount</th>
                  <th className="pb-1 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {withBalance.map((tx) => (
                  <tr
                    key={tx.id}
                    className="cursor-pointer border-b hover:bg-gray-50"
                    onClick={() => setExpandedTx(expandedTx === tx.id ? null : tx.id)}
                  >
                    <td className="py-1">{formatDate(tx.timestamp)}</td>
                    <td className="py-1">{getItemName(tx)}</td>
                    <td className="py-1">{getReason(tx)}</td>
                    <td className={`py-1 text-right ${tx.amount >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {tx.amount >= 0 ? "+" : ""}
                      {tx.amount}
                    </td>
                    <td className="py-1 text-right">{tx.runningBalance}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}

      {expandedTx && (
        <div className="mt-2 rounded bg-gray-100 p-3">
          <h5 className="mb-1 text-xs font-semibold uppercase text-gray-500">Transaction Detail</h5>
          <pre className="overflow-auto text-xs">
            {JSON.stringify(
              transactions.find((tx) => tx.id === expandedTx),
              null,
              2,
            )}
          </pre>
          <button
            onClick={() => setExpandedTx(null)}
            className="mt-2 text-xs text-blue-600 hover:underline"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement UserProfile**

`src/client/pages/users/UserProfile.tsx`:
```tsx
import { useState } from "react";
import { useParams } from "react-router";
import { toast } from "sonner";
import { useUserProfile, useAwardCurrency, useBan, useUnban, usePasswordReset } from "../../lib/queries/users.js";
import { formatDate, formatDateRelative, passwordSuggestion, stripPrefix } from "../../lib/utils.js";
import { getConfig } from "../../lib/config.js";
import { Transactions } from "./Transactions.js";

export function UserProfile() {
  const { username } = useParams<{ username: string }>();
  const { data: profile, isLoading, error } = useUserProfile(username ?? "");
  const config = getConfig();

  if (isLoading) return <p className="text-gray-500">Loading profile...</p>;
  if (error) return <p className="text-red-600">Error loading profile: {error.message}</p>;
  if (!profile) return <p className="text-gray-500">No profile data</p>;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        {profile.avatar && (
          <img src={profile.avatar} alt="avatar" className="h-16 w-16 rounded" />
        )}
        <div>
          <h2 className="text-xl font-bold">{profile.userId}</h2>
          {profile.directory?.aliases && (
            <p className="text-sm text-gray-500">
              {Object.entries(profile.directory.aliases)
                .map(([k, v]) => `${k}: ${v}`)
                .join(" | ")}
            </p>
          )}
          {profile.metadata && (profile.metadata as Record<string, unknown>).auth && (
            <p className="text-sm text-gray-400">
              Last seen {formatDateRelative(String((profile.metadata as Record<string, unknown>).auth))}
            </p>
          )}
        </div>
        <div className="ml-auto">
          <BanBadge banned={profile.banInfo.exists} since={profile.banInfo.createdAt} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <BanButton userId={profile.userId} banned={profile.banInfo.exists} />
        <PasswordResetButton userId={profile.userId} />
        <AwardButton userId={profile.userId} currencies={config.currencies} />
      </div>

      {/* Balance */}
      {Array.isArray(profile.balance) && profile.balance.length > 0 && (
        <div>
          <h3 className="mb-2 text-lg font-semibold">Balance</h3>
          <div className="flex gap-4">
            {profile.balance.map((b: { currency: string; count: number }) => (
              <div key={b.currency} className="rounded bg-gray-100 px-4 py-2">
                <span className="font-mono text-lg font-bold">{b.count}</span>
                <span className="ml-2 text-sm text-gray-500">{stripPrefix(b.currency)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions */}
      <div>
        <h3 className="mb-2 text-lg font-semibold">Transactions</h3>
        <Transactions transactions={profile.transactions} />
      </div>
    </div>
  );
}

// --- Sub-components ---

function BanBadge({ banned, since }: { banned: boolean; since?: string }) {
  if (banned) {
    return (
      <span className="rounded bg-red-100 px-3 py-1 text-sm font-medium text-red-800">
        Banned {since ? formatDateRelative(since) : ""}
      </span>
    );
  }
  return (
    <span className="rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-800">
      In Good Standing
    </span>
  );
}

function BanButton({ userId, banned }: { userId: string; banned: boolean }) {
  const ban = useBan(userId);
  const unban = useUnban(userId);
  const [confirming, setConfirming] = useState(false);

  function handleAction() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const mutation = banned ? unban : ban;
    mutation.mutate(undefined, {
      onSuccess: () => {
        toast.success(banned ? "User unbanned" : "User banned");
        setConfirming(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="flex gap-1">
      <button
        onClick={handleAction}
        className={`rounded px-3 py-1.5 text-sm text-white ${
          banned ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"
        }`}
      >
        {confirming ? `Confirm ${banned ? "Unban" : "Ban"}?` : banned ? "Unban" : "Ban"}
      </button>
      {confirming && (
        <button onClick={() => setConfirming(false)} className="text-sm text-gray-500 hover:underline">
          Cancel
        </button>
      )}
    </div>
  );
}

function PasswordResetButton({ userId }: { userId: string }) {
  const reset = usePasswordReset(userId);
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");

  function handleOpen() {
    setNewPassword(passwordSuggestion());
    setOpen(true);
  }

  function handleReset() {
    reset.mutate(
      { newPassword },
      {
        onSuccess: () => {
          toast.success(`Password reset for ${userId}`);
          setOpen(false);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (!open) {
    return (
      <button onClick={handleOpen} className="rounded bg-yellow-500 px-3 py-1.5 text-sm text-white hover:bg-yellow-600">
        Reset Password
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded border border-yellow-200 bg-yellow-50 p-2">
      <input
        type="text"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        className="rounded border px-2 py-1 text-sm"
      />
      <button onClick={handleReset} disabled={reset.isPending} className="rounded bg-yellow-500 px-3 py-1 text-sm text-white">
        {reset.isPending ? "Resetting..." : "Set Password"}
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline">
        Cancel
      </button>
    </div>
  );
}

function AwardButton({ userId, currencies }: { userId: string; currencies: string[] }) {
  const award = useAwardCurrency(userId);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState(currencies[0] ?? "");

  function handleAward() {
    const num = parseInt(amount, 10);
    if (!num || num <= 0) return;
    award.mutate(
      { amount: num, currency },
      {
        onSuccess: () => {
          toast.success(`Awarded ${num} ${stripPrefix(currency)} to ${userId}`);
          setOpen(false);
          setAmount("");
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700">
        Award Currency
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 rounded border border-blue-200 bg-blue-50 p-2">
      <input
        type="number"
        min="1"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        placeholder="Amount"
        className="w-24 rounded border px-2 py-1 text-sm"
      />
      <select value={currency} onChange={(e) => setCurrency(e.target.value)} className="rounded border px-2 py-1 text-sm">
        {currencies.map((c) => (
          <option key={c} value={c}>
            {stripPrefix(c)}
          </option>
        ))}
      </select>
      <button onClick={handleAward} disabled={award.isPending} className="rounded bg-blue-600 px-3 py-1 text-sm text-white">
        {award.isPending ? "Awarding..." : "Award"}
      </button>
      <button onClick={() => setOpen(false)} className="text-sm text-gray-500 hover:underline">
        Cancel
      </button>
    </div>
  );
}
```

- [ ] **Step 3: Update router to use UserProfile**

In `src/client/router.tsx`, import and use `UserProfile`:
```tsx
import { UserProfile } from "./pages/users/UserProfile.js";
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/users/UserProfile.tsx src/client/pages/users/Transactions.tsx src/client/router.tsx
git commit -m "feat: add user profile page with balance, transactions, and actions"
```

---

## Task 7: Reports, Chat, and Reported Users Pages

**Files:**
- Create: `src/client/pages/users/ReportsBlocks.tsx`
- Create: `src/client/pages/Reports.tsx`
- Create: `src/client/pages/Chat.tsx`
- Modify: `src/client/router.tsx`

- [ ] **Step 1: Implement ReportsBlocks sub-component**

`src/client/pages/users/ReportsBlocks.tsx`:
```tsx
import { Link } from "react-router";
import { useReportsBlocks } from "../../lib/queries/users.js";
import { formatDate } from "../../lib/utils.js";

export function ReportsBlocks({ userId }: { userId: string }) {
  const { data, isLoading } = useReportsBlocks(userId);

  if (isLoading) return <p className="text-sm text-gray-500">Loading reports...</p>;
  if (!data) return null;

  const { reportedBy = [], blockedBy = [] } = data;

  if (reportedBy.length === 0 && blockedBy.length === 0) {
    return <p className="text-sm text-gray-500">No reports or blocks</p>;
  }

  return (
    <div className="space-y-3">
      {reportedBy.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-600">Reported By ({reportedBy.length})</h4>
          <ul className="mt-1 space-y-1">
            {reportedBy.map((r, i) => (
              <li key={i} className="text-sm">
                <Link
                  to={`/admin/v1/web/chat/${userId},${r.username}`}
                  className="text-blue-600 hover:underline"
                >
                  {r.username}
                </Link>
                <span className="ml-2 text-gray-400">{formatDate(r.on)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {blockedBy.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-600">Blocked By ({blockedBy.length})</h4>
          <ul className="mt-1 space-y-1">
            {blockedBy.map((b, i) => (
              <li key={i} className="text-sm">
                <Link
                  to={`/admin/v1/web/chat/${userId},${b.username}`}
                  className="text-blue-600 hover:underline"
                >
                  {b.username}
                </Link>
                <span className="ml-2 text-gray-400">{formatDate(b.on)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Implement Reports page (most-reported users)**

`src/client/pages/Reports.tsx`:
```tsx
import { Link } from "react-router";
import { useHighlyReported } from "../lib/queries/users.js";

export function Reports() {
  const { data, isLoading, error } = useHighlyReported();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Most Reported Users</h1>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      {data && data.length === 0 && (
        <p className="text-gray-500">No reported users</p>
      )}

      {data && data.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2">User</th>
              <th className="pb-2 text-right">Reports</th>
            </tr>
          </thead>
          <tbody>
            {data.map((user) => (
              <tr key={user.target} className="border-b hover:bg-gray-50">
                <td className="py-2">
                  <Link to={`/admin/v1/web/users/${user.target}`} className="text-blue-600 hover:underline">
                    {user.target}
                  </Link>
                </td>
                <td className="py-2 text-right">{user.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Implement Chat page**

`src/client/pages/Chat.tsx`:
```tsx
import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useChatRoom } from "../lib/queries/users.js";
import { formatDate } from "../lib/utils.js";

export function Chat() {
  const { username1, username2 } = useParams<{ username1: string; username2: string }>();
  const navigate = useNavigate();
  const [input1, setInput1] = useState(username1 ?? "");
  const [input2, setInput2] = useState(username2 ?? "");
  const { data, isLoading, error } = useChatRoom(username1 ?? "", username2 ?? "");

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input1.trim() && input2.trim()) {
      navigate(`/admin/v1/web/chat/${input1.trim()},${input2.trim()}`);
    }
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Chat History</h1>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={input1}
          onChange={(e) => setInput1(e.target.value)}
          placeholder="Username 1"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <input
          type="text"
          value={input2}
          onChange={(e) => setInput2(e.target.value)}
          placeholder="Username 2"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Get Chat
        </button>
      </form>

      {isLoading && <p className="text-gray-500">Loading chat...</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      {data && (
        <div>
          <p className="mb-3 text-sm text-gray-500">{data.messages.length} messages</p>
          <div className="space-y-2">
            {data.messages.map((msg, i) => {
              const isSystem = msg.from === "$$";
              return (
                <div
                  key={i}
                  className={`rounded p-2 text-sm ${
                    isSystem
                      ? "bg-gray-100 text-center text-gray-500 italic"
                      : msg.from === data.users[0]
                        ? "bg-blue-50"
                        : "bg-green-50"
                  }`}
                >
                  {!isSystem && <span className="mr-2 font-semibold">{msg.from}</span>}
                  <span>{msg.message}</span>
                  <span className="ml-2 text-xs text-gray-400">{formatDate(msg.timestamp)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Update router**

Update `src/client/router.tsx` to use Reports and Chat pages instead of Placeholder:

```tsx
import { Reports } from "./pages/Reports.js";
import { Chat } from "./pages/Chat.js";
```

Replace the placeholder routes for reported and chat.

- [ ] **Step 5: Add ReportsBlocks to UserProfile**

Add to `UserProfile.tsx` after the Transactions section:

```tsx
import { ReportsBlocks } from "./ReportsBlocks.js";
```

And add in the profile render:
```tsx
{/* Reports & Blocks */}
<div>
  <h3 className="mb-2 text-lg font-semibold">Reports & Blocks</h3>
  <ReportsBlocks userId={profile.userId} />
</div>
```

- [ ] **Step 6: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 7: Commit**

```bash
git add src/client/pages/users/ReportsBlocks.tsx src/client/pages/Reports.tsx \
  src/client/pages/Chat.tsx src/client/router.tsx src/client/pages/users/UserProfile.tsx
git commit -m "feat: add Reports, Chat, and ReportsBlocks pages"
```

---

## Task 8: Metadata Editor + Email Dialog

**Files:**
- Create: `src/client/pages/users/MetadataEditor.tsx`
- Create: `src/client/pages/users/EmailDialog.tsx`
- Modify: `src/client/pages/users/UserProfile.tsx`

- [ ] **Step 1: Implement MetadataEditor**

`src/client/pages/users/MetadataEditor.tsx`:
```tsx
import { useState } from "react";
import { toast } from "sonner";
import { useUserMetadata, useUpdateMetadata } from "../../lib/queries/users.js";

export function MetadataEditor({ userId }: { userId: string }) {
  const { data, isLoading } = useUserMetadata(userId);
  const update = useUpdateMetadata(userId);

  if (isLoading) return <p className="text-sm text-gray-500">Loading metadata...</p>;
  if (!data || data.length === 0) return <p className="text-sm text-gray-500">No metadata fields configured</p>;

  return (
    <div className="space-y-2">
      {data.map((field) => (
        <MetadataField
          key={field.id}
          fieldId={field.id}
          initialValue={String(field.value ?? "")}
          onSave={(value) =>
            update.mutate(
              { key: field.id, value },
              {
                onSuccess: () => toast.success(`Updated ${field.id}`),
                onError: (err) => toast.error(err.message),
              },
            )
          }
        />
      ))}
    </div>
  );
}

function MetadataField({
  fieldId,
  initialValue,
  onSave,
}: {
  fieldId: string;
  initialValue: string;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);

  if (!editing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-gray-600">{fieldId}:</span>
        <span>{value || <span className="italic text-gray-400">empty</span>}</span>
        <button onClick={() => setEditing(true)} className="ml-auto text-blue-600 hover:underline text-xs">
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="font-medium text-gray-600">{fieldId}:</span>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded border px-2 py-1 text-sm"
      />
      <button
        onClick={() => { onSave(value); setEditing(false); }}
        className="rounded bg-green-600 px-2 py-1 text-xs text-white"
      >
        Save
      </button>
      <button onClick={() => { setValue(initialValue); setEditing(false); }} className="text-xs text-gray-500 hover:underline">
        Cancel
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Implement EmailDialog**

`src/client/pages/users/EmailDialog.tsx`:
```tsx
import { useState } from "react";
import { toast } from "sonner";
import { useSendEmail } from "../../lib/queries/users.js";

interface EmailDialogProps {
  email: string;
  username: string;
  onClose: () => void;
}

export function EmailDialog({ email, username, onClose }: EmailDialogProps) {
  const send = useSendEmail();
  const [subject, setSubject] = useState(`Message for ${username}`);
  const [text, setText] = useState("");

  function handleSend() {
    if (!subject.trim() || !text.trim()) {
      toast.error("Subject and body are required");
      return;
    }
    send.mutate(
      {
        to: email,
        subject: subject.replace("{username}", username),
        text: text.replace("{username}", username),
      },
      {
        onSuccess: () => {
          toast.success("Email sent");
          onClose();
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded bg-white p-6 shadow-lg">
        <h3 className="mb-4 text-lg font-semibold">Send Email to {username}</h3>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700">To</label>
            <input type="text" value={email} disabled className="mt-1 w-full rounded border bg-gray-50 px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Body</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={6}
              className="mt-1 w-full rounded border px-3 py-2 text-sm"
              placeholder="Use {username} for substitution"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="rounded px-4 py-2 text-sm text-gray-600 hover:bg-gray-100">
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={send.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {send.isPending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Add MetadataEditor and EmailDialog to UserProfile**

In `UserProfile.tsx`, add imports:
```tsx
import { MetadataEditor } from "./MetadataEditor.js";
import { EmailDialog } from "./EmailDialog.js";
```

Add email button in actions section (only if user has email from directory):
```tsx
{profile.directory?.aliases?.email && (
  <button
    onClick={() => setShowEmail(true)}
    className="rounded bg-purple-600 px-3 py-1.5 text-sm text-white hover:bg-purple-700"
  >
    Send Email
  </button>
)}
```

Add state: `const [showEmail, setShowEmail] = useState(false);`

Add metadata section after Reports & Blocks:
```tsx
{/* Metadata */}
<div>
  <h3 className="mb-2 text-lg font-semibold">Metadata</h3>
  <MetadataEditor userId={profile.userId} />
</div>
```

Add email dialog at end of component:
```tsx
{showEmail && profile.directory?.aliases?.email && (
  <EmailDialog
    email={profile.directory.aliases.email}
    username={profile.userId}
    onClose={() => setShowEmail(false)}
  />
)}
```

- [ ] **Step 4: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/users/MetadataEditor.tsx src/client/pages/users/EmailDialog.tsx \
  src/client/pages/users/UserProfile.tsx
git commit -m "feat: add metadata editor and email dialog to user profile"
```

---

## Task 9: Full Verification

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass.

- [ ] **Step 2: Run type checker**

```bash
npx tsc --noEmit
```

- [ ] **Step 3: Build**

```bash
npx vite build --config vite.config.ts
```

- [ ] **Step 4: Fix any issues and commit**

---

## Summary

After completing all 9 tasks, Phase 3 delivers:

| Component | Status |
|-----------|--------|
| Backend user routes (search, profile, ban, rewards, password, metadata, chat) | Implemented + tested |
| TanStack Query hooks (13 hooks) | Implemented |
| User search page with auto-navigation | Implemented |
| User profile (avatar, header, ban badge, actions) | Implemented |
| Transactions table (grouped, running balance) | Implemented |
| Reports & blocks display with chat links | Implemented |
| Most-reported users page | Implemented |
| Chat history viewer | Implemented |
| Metadata editor (inline edit/save) | Implemented |
| Email dialog (compose and send) | Implemented |
| Utility functions (dates, password, groupBy) | Implemented |

**Next:** Phase 4 — Virtual Currency Pages (Items + Packs CRUD, backup/restore)
