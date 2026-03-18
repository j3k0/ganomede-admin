# Phase 1: Project Skeleton & Backend Core — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the new TypeScript project alongside the old code, implementing the complete backend (config, auth, proxy, mailer, health, error handling, static serving) with tests.

**Architecture:** Express 5 backend in `src/server/` serving a Vite-built SPA from `src/client/`. Backend proxies authenticated requests to an upstream triominos-server. New code lives in `src/`; old code (`web/`, `server/`, `config.js`, `index.js`) is untouched.

**Tech Stack:** Node 22, TypeScript 5.8, Express 5, Zod 3, Pino 9, Vitest, supertest, MSW 2, helmet 8, express-rate-limit 7, Nodemailer 6, Vite 6, concurrently

**Spec:** `docs/superpowers/specs/2026-03-17-modernization-design.md`

---

## File Map

All new files created under `src/` and `tests/`. Old code is untouched.

| File | Responsibility |
|------|---------------|
| `src/server/config.ts` | Zod-validated env config, dual-backend support |
| `src/server/logger.ts` | Pino logger factory |
| `src/server/auth.ts` | Session token auth: login/logout routes, validate middleware, rate limiter |
| `src/server/proxy.ts` | Upstream proxy with timeout, binary support, URL resolution |
| `src/server/mailer.ts` | Nodemailer transport wrapper, conditionally enabled |
| `src/server/errors.ts` | Error classes (UpstreamError, ApiError) and Express error middleware |
| `src/server/routes/health.ts` | `/ping/:token` and `/about` endpoints |
| `src/server/routes/mail.ts` | `POST /send-email` with Zod validation |
| `src/server/app.ts` | Express app: middleware stack, route mounting, static serving, HTML injection |
| `src/server/index.ts` | Entry point: parse config, start server, handle uncaught errors |
| `src/client/index.html` | Minimal HTML shell for Vite (placeholder for Phase 2) |
| `src/client/main.tsx` | Minimal React mount (placeholder for Phase 2) |
| `tests/server/config.test.ts` | Config validation tests |
| `tests/server/auth.test.ts` | Auth flow tests (login, logout, validate, rate limiting, session expiry) |
| `tests/server/proxy.test.ts` | Proxy tests (JSON, binary, timeout, error mapping) |
| `tests/server/routes/health.test.ts` | Health endpoint tests |
| `tests/server/errors.test.ts` | Error handler middleware tests |
| `tests/server/routes/mail.test.ts` | Mail endpoint tests |
| `tests/server/app.test.ts` | App-level integration tests |
| `tests/server/helpers.ts` | Test utilities: createTestApp, mock config |

**Config files (project root):**

| File | Purpose |
|------|---------|
| `package.json` | New dependencies, scripts (old deps preserved until cutover) |
| `.nvmrc` | Updated to `22` |
| `tsconfig.json` | Shared TypeScript config |
| `tsconfig.server.json` | Server-specific TS config (Node target, CommonJS output) |
| `vite.config.ts` | Vite config with dev proxy and build output |
| `eslint.config.ts` | ESLint 9 flat config with TypeScript + React |
| `.prettierrc` | Prettier config |
| `Dockerfile` | New multi-stage build (old renamed to `Dockerfile.legacy`) |
| `run-server.local.sh` | Updated with `UPSTREAM_URL` support |

---

## Task 1: Initialize Project

**Files:**
- Modify: `package.json`
- Modify: `.nvmrc`
- Create: `tsconfig.json`
- Create: `tsconfig.server.json`
- Create: `vite.config.ts`
- Create: `eslint.config.ts`
- Create: `.prettierrc`
- Create: `src/client/index.html`
- Create: `src/client/main.tsx`
- Create: `src/client/styles/globals.css`

- [ ] **Step 1: Update .nvmrc**

Change content from `8.8.1` to:
```
22
```

- [ ] **Step 2: Install new dependencies**

```bash
nvm use 22

# Production dependencies
npm install express@5 zod pino pino-pretty nodemailer helmet express-rate-limit cookie-parser

# Frontend dependencies (will be used in Phase 2, needed for Vite build now)
npm install react@19 react-dom@19

# Dev dependencies
npm install -D typescript @types/node @types/express @types/cookie-parser @types/nodemailer \
  vite @vitejs/plugin-react \
  vitest supertest @types/supertest msw \
  eslint @eslint/js typescript-eslint eslint-plugin-react-hooks \
  prettier \
  tsx concurrently \
  @types/react @types/react-dom
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "baseUrl": ".",
    "paths": {
      "@server/*": ["src/server/*"],
      "@client/*": ["src/client/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create tsconfig.server.json**

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "outDir": "dist/server",
    "rootDir": "src/server"
  },
  "include": ["src/server/**/*"]
}
```

- [ ] **Step 5: Create vite.config.ts**

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: "src/client",
  build: {
    outDir: "../../dist/client",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/admin/v1/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@client": path.resolve(__dirname, "src/client"),
    },
  },
});
```

- [ ] **Step 6: Create eslint.config.ts**

```typescript
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
    },
  },
  { ignores: ["dist/", "web/", "server/", "tests/*.test.js", "node_modules/"] }
);
```

- [ ] **Step 7: Create .prettierrc**

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "all",
  "tabWidth": 2,
  "printWidth": 100
}
```

- [ ] **Step 8: Create placeholder frontend files**

`src/client/index.html`:
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><!--BRANDING_TITLE--></title>
</head>
<body>
  <!--ADMIN_CONFIG-->
  <div id="app"></div>
  <script type="module" src="/main.tsx"></script>
</body>
</html>
```

`src/client/main.tsx`:
```tsx
import React from "react";
import ReactDOM from "react-dom/client";

function App() {
  return <div>Admin Panel — Phase 2 will add routing and pages</div>;
}

ReactDOM.createRoot(document.getElementById("app")!).render(<App />);
```

`src/client/styles/globals.css`:
```css
/* Tailwind directives will be added in Phase 2 */
body {
  font-family: system-ui, sans-serif;
  margin: 0;
  padding: 20px;
}
```

- [ ] **Step 9: Add scripts to package.json**

Add these to the `scripts` section (preserve existing scripts):
```json
{
  "dev": "concurrently \"npm:dev:client\" \"npm:dev:server\"",
  "dev:client": "vite --config vite.config.ts",
  "dev:server": "tsx watch src/server/index.ts",
  "build:new": "vite build --config vite.config.ts && tsc -p tsconfig.server.json",
  "test:new": "vitest run",
  "test:new:watch": "vitest",
  "lint:new": "eslint src/ tests/",
  "typecheck": "tsc --noEmit"
}
```

Note: Scripts are prefixed with `:new` or use separate names to avoid breaking the old build. After cutover, rename them.

- [ ] **Step 10: Verify project compiles**

```bash
npx tsc --noEmit
npx vite build --config vite.config.ts
```
Expected: Both succeed with no errors.

- [ ] **Step 11: Commit**

```bash
git add .nvmrc tsconfig.json tsconfig.server.json vite.config.ts eslint.config.ts .prettierrc \
  src/client/index.html src/client/main.tsx src/client/styles/globals.css package.json package-lock.json
git commit -m "feat: initialize TypeScript + Vite + ESLint project skeleton"
```

---

## Task 2: Vitest Setup

**Files:**
- Create: `vitest.config.ts`
- Create: `tests/server/helpers.ts`

- [ ] **Step 1: Create vitest.config.ts**

```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    env: {
      ADMIN_USERNAME: "testadmin",
      ADMIN_PASSWORD: "testpassword",
      API_SECRET: "test-secret",
      CURRENCY_CODES: "gold,silver",
      LOG_LEVEL: "silent",
    },
  },
});
```

- [ ] **Step 2: Create test helpers**

`tests/server/helpers.ts`:
```typescript
import { type Express } from "express";

/**
 * Minimal env vars for config to parse without errors.
 * Tests can override individual vars before importing config.
 */
export const TEST_ENV = {
  ADMIN_USERNAME: "testadmin",
  ADMIN_PASSWORD: "testpassword",
  API_SECRET: "test-secret",
  CURRENCY_CODES: "gold,silver",
  UPSTREAM_URL: "http://localhost:9999",
} as const;

/**
 * Set env vars for a test, restore after.
 */
export function withEnv(overrides: Record<string, string | undefined>, fn: () => void | Promise<void>) {
  const saved: Record<string, string | undefined> = {};
  for (const key of Object.keys(overrides)) {
    saved[key] = process.env[key];
    if (overrides[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = overrides[key];
    }
  }
  try {
    return fn();
  } finally {
    for (const key of Object.keys(saved)) {
      if (saved[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = saved[key];
      }
    }
  }
}
```

- [ ] **Step 3: Verify vitest runs**

```bash
npx vitest run
```
Expected: "No test files found" (no tests yet), exit 0.

- [ ] **Step 4: Commit**

```bash
git add vitest.config.ts tests/server/helpers.ts
git commit -m "feat: configure Vitest test framework"
```

---

## Task 3: Config Module

**Files:**
- Create: `src/server/config.ts`
- Create: `tests/server/config.test.ts`

- [ ] **Step 1: Write config tests**

`tests/server/config.test.ts`:
```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";

import { parseConfig } from "../../src/server/config.js";

// Use parseConfig directly with test env objects — avoids process.env side effects.
function loadConfig(env: Record<string, string | undefined>) {
  return parseConfig(env);
}

const VALID_ENV = {
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "secret",
  API_SECRET: "api-secret",
  CURRENCY_CODES: "gold,silver",
  UPSTREAM_URL: "http://localhost:8080",
};

describe("config", () => {
  it("parses valid env vars", () => {
    const config = loadConfig(VALID_ENV);
    expect(config.PORT).toBe(8000);
    expect(config.HOST).toBe("0.0.0.0");
    expect(config.ADMIN_USERNAME).toBe("admin");
    expect(config.ADMIN_PASSWORD).toBe("secret");
    expect(config.API_SECRET).toBe("api-secret");
    expect(config.CURRENCY_CODES).toEqual(["gold", "silver"]);
    expect(config.UPSTREAM_URL).toBe("http://localhost:8080");
    expect(config.BRANDING_TITLE).toBe("Ganomede");
    expect(config.UPSTREAM_TIMEOUT_MS).toBe(30000);
  });

  it("uses defaults for optional fields", () => {
    const config = loadConfig(VALID_ENV);
    expect(config.HOST).toBe("0.0.0.0");
    expect(config.PORT).toBe(8000);
    expect(config.BRANDING_TITLE).toBe("Ganomede");
    expect(config.CHAT_ROOM_PREFIX).toBe("");
    expect(config.USER_METADATA_LIST).toEqual([]);
  });

  it("throws when ADMIN_USERNAME is missing", () => {
    const env = { ...VALID_ENV, ADMIN_USERNAME: undefined };
    expect(() => loadConfig(env)).toThrow();
  });

  it("throws when ADMIN_PASSWORD is missing", () => {
    const env = { ...VALID_ENV, ADMIN_PASSWORD: undefined };
    expect(() => loadConfig(env)).toThrow();
  });

  it("throws when API_SECRET is missing", () => {
    const env = { ...VALID_ENV, API_SECRET: undefined };
    expect(() => loadConfig(env)).toThrow();
  });

  it("throws when CURRENCY_CODES is missing", () => {
    const env = { ...VALID_ENV, CURRENCY_CODES: undefined };
    expect(() => loadConfig(env)).toThrow();
  });

  it("allows UPSTREAM_URL to be absent (legacy mode)", () => {
    const env = { ...VALID_ENV, UPSTREAM_URL: undefined };
    const config = loadConfig(env);
    expect(config.UPSTREAM_URL).toBeUndefined();
  });

  it("rejects non-HTTP UPSTREAM_URL", () => {
    const env = { ...VALID_ENV, UPSTREAM_URL: "ftp://bad" };
    expect(() => loadConfig(env)).toThrow();
  });

  it("parses CURRENCY_CODES as comma-separated array", () => {
    const env = { ...VALID_ENV, CURRENCY_CODES: "gold,silver,gems" };
    const config = loadConfig(env);
    expect(config.CURRENCY_CODES).toEqual(["gold", "silver", "gems"]);
  });

  it("parses mailer config when MAILER_HOST is set", () => {
    const env = { ...VALID_ENV, MAILER_HOST: "smtp.example.com", MAILER_USER: "user", MAILER_PASSWORD: "pass" };
    const config = loadConfig(env);
    expect(config.MAILER_HOST).toBe("smtp.example.com");
    expect(config.MAILER_PORT).toBe(587);
  });

  it("mailer is disabled when MAILER_HOST is absent", () => {
    const config = loadConfig(VALID_ENV);
    expect(config.MAILER_HOST).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/config.test.ts
```
Expected: FAIL — `src/server/config.ts` does not exist yet.

- [ ] **Step 3: Implement config.ts**

`src/server/config.ts`:
```typescript
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default("0.0.0.0"),
  NODE_ENV: z.string().default("development"),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  API_SECRET: z.string().min(1),
  UPSTREAM_URL: z
    .string()
    .url()
    .refine(
      (s) => s.startsWith("http://") || s.startsWith("https://"),
      "UPSTREAM_URL must be an HTTP(S) URL",
    )
    .optional(),
  BRANDING_TITLE: z.string().default("Ganomede"),
  CURRENCY_CODES: z
    .string({ required_error: "CURRENCY_CODES env var is required (comma-separated)" })
    .min(1)
    .transform((s) => s.split(",")),
  USER_METADATA_LIST: z
    .string()
    .default("")
    .transform((s) => (s ? s.split(",") : [])),
  CHAT_ROOM_PREFIX: z.string().default(""),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().default(30_000),

  // Mailer config (all optional — if MAILER_HOST is absent, mailer is disabled)
  MAILER_HOST: z.string().optional(),
  MAILER_PORT: z.coerce.number().default(587),
  MAILER_SECURE: z
    .string()
    .default("false")
    .transform((s) => s === "true"),
  MAILER_USER: z.string().optional(),
  MAILER_PASSWORD: z.string().optional(),
  MAILER_SEND_FROM: z.string().default("noreply@ganomede.com"),
});

export type Config = z.infer<typeof envSchema>;

/**
 * Parse config from an env-like object. Exported for testing.
 */
export function parseConfig(env: Record<string, string | undefined>): Config {
  return envSchema.parse(env);
}

/**
 * Singleton config parsed from process.env. Used at runtime.
 * Throws on startup if env vars are invalid.
 */
export const config: Config = parseConfig(process.env);
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/server/config.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/config.ts tests/server/config.test.ts
git commit -m "feat: add Zod-validated config module with tests"
```

---

## Task 4: Logger Module

**Files:**
- Create: `src/server/logger.ts`

- [ ] **Step 1: Implement logger.ts**

```typescript
import pino from "pino";

export function createLogger(name: string, level?: string): pino.Logger {
  return pino({
    name,
    level: level ?? (process.env.NODE_ENV === "test" ? "silent" : "info"),
    ...(process.env.NODE_ENV !== "production" && {
      transport: { target: "pino-pretty", options: { colorize: true } },
    }),
  });
}

export const logger = createLogger(process.env.BRANDING_TITLE ?? "Ganomede");
```

No dedicated tests — the logger is a thin Pino wrapper. It will be exercised via integration tests.

- [ ] **Step 2: Commit**

```bash
git add src/server/logger.ts
git commit -m "feat: add Pino logger module"
```

---

## Task 5: Auth Module

**Files:**
- Create: `src/server/auth.ts`
- Create: `tests/server/auth.test.ts`

- [ ] **Step 1: Write auth tests**

`tests/server/auth.test.ts`:
```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";
import cookieParser from "cookie-parser";
import { createAuthModule } from "../../src/server/auth.js";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());

  const auth = createAuthModule({
    username: "admin",
    password: "secret",
    isProduction: false,
    sessionTtlMs: 604_800_000,
  });

  // Mount auth routes
  app.use("/api", auth.router);

  // Protected route
  app.get("/api/protected", auth.validate, (_req, res) => {
    res.json({ success: true });
  });

  return { app, auth };
}

describe("auth", () => {
  describe("POST /api/login", () => {
    it("returns success and sets cookie on valid credentials", async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "secret" });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
      expect(res.headers["set-cookie"]).toBeDefined();
      expect(res.headers["set-cookie"][0]).toMatch(/token=/);
      expect(res.headers["set-cookie"][0]).toMatch(/HttpOnly/);
    });

    it("returns 401 on invalid credentials", async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "wrong" });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("returns 401 when username is missing", async () => {
      const { app } = createTestApp();
      const res = await request(app).post("/api/login").send({ password: "secret" });
      expect(res.status).toBe(401);
    });
  });

  describe("POST /api/logout", () => {
    it("clears cookie and invalidates session", async () => {
      const { app } = createTestApp();

      // Login first
      const loginRes = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "secret" });
      const cookie = loginRes.headers["set-cookie"][0];

      // Logout
      const logoutRes = await request(app)
        .post("/api/logout")
        .set("Cookie", cookie);
      expect(logoutRes.status).toBe(200);
      expect(logoutRes.body).toEqual({ success: true });

      // Token should no longer work
      const protectedRes = await request(app)
        .get("/api/protected")
        .set("Cookie", cookie);
      expect(protectedRes.status).toBe(401);
    });
  });

  describe("validate middleware", () => {
    it("allows requests with valid session token", async () => {
      const { app } = createTestApp();

      const loginRes = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "secret" });
      const cookie = loginRes.headers["set-cookie"][0];

      const res = await request(app)
        .get("/api/protected")
        .set("Cookie", cookie);
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ success: true });
    });

    it("rejects requests without cookie", async () => {
      const { app } = createTestApp();
      const res = await request(app).get("/api/protected");
      expect(res.status).toBe(401);
      expect(res.body).toEqual({
        success: false,
        error: "Need authentication",
        needAuthentication: true,
      });
    });

    it("rejects requests with invalid token", async () => {
      const { app } = createTestApp();
      const res = await request(app)
        .get("/api/protected")
        .set("Cookie", "token=invalid-token");
      expect(res.status).toBe(401);
    });
  });

  describe("session expiry", () => {
    it("rejects expired sessions", async () => {
      const app = express();
      app.use(express.json());
      app.use(cookieParser());

      const auth = createAuthModule({
        username: "admin",
        password: "secret",
        isProduction: false,
        sessionTtlMs: 1, // 1ms TTL — expires immediately
      });

      app.use("/api", auth.router);
      app.get("/api/protected", auth.validate, (_req, res) => {
        res.json({ success: true });
      });

      const loginRes = await request(app)
        .post("/api/login")
        .send({ username: "admin", password: "secret" });
      const cookie = loginRes.headers["set-cookie"][0];

      // Wait for expiry
      await new Promise((r) => setTimeout(r, 10));

      const res = await request(app)
        .get("/api/protected")
        .set("Cookie", cookie);
      expect(res.status).toBe(401);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/auth.test.ts
```
Expected: FAIL — `src/server/auth.ts` does not exist.

- [ ] **Step 3: Implement auth.ts**

`src/server/auth.ts`:
```typescript
import { randomUUID } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";

interface AuthOptions {
  username: string;
  password: string;
  isProduction: boolean;
  sessionTtlMs: number;
}

interface Session {
  createdAt: number;
}

export function createAuthModule(options: AuthOptions) {
  const sessions = new Map<string, Session>();
  const router = Router();

  function createSession(): string {
    const token = randomUUID();
    sessions.set(token, { createdAt: Date.now() });
    return token;
  }

  function isValidSession(token: string): boolean {
    const session = sessions.get(token);
    if (!session) return false;
    if (Date.now() - session.createdAt > options.sessionTtlMs) {
      sessions.delete(token);
      return false;
    }
    return true;
  }

  router.post("/login", (req: Request, res: Response) => {
    const { username, password } = req.body ?? {};
    if (username !== options.username || password !== options.password) {
      res.status(401).json({
        success: false,
        error: "Invalid username or password.",
      });
      return;
    }

    const token = createSession();
    res.cookie("token", token, {
      path: "/",
      httpOnly: true,
      secure: options.isProduction,
      sameSite: "lax",
      maxAge: options.sessionTtlMs,
    });
    res.json({ success: true });
  });

  router.post("/logout", validate, (req: Request, res: Response) => {
    const token = req.cookies?.token;
    if (token) sessions.delete(token);
    res.clearCookie("token", { path: "/" });
    res.json({ success: true });
  });

  function validate(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies?.token;
    if (token && isValidSession(token)) {
      return next();
    }
    res.status(401).json({
      success: false,
      error: "Need authentication",
      needAuthentication: true,
    });
  }

  return { router, validate, sessions };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/server/auth.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/auth.ts tests/server/auth.test.ts
git commit -m "feat: add auth module with random session tokens and tests"
```

---

## Task 6: Proxy Module

**Files:**
- Create: `src/server/proxy.ts`
- Create: `tests/server/proxy.test.ts`

- [ ] **Step 1: Write proxy tests**

`tests/server/proxy.test.ts`:
```typescript
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { proxyToUpstream } from "../../src/server/proxy.js";

const UPSTREAM = "http://localhost:9999";

const mswServer = setupServer();

beforeAll(() => mswServer.listen({ onUnhandledRequest: "error" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

describe("proxyToUpstream", () => {
  it("forwards GET requests and returns JSON", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/users/v1/search/alice`, () => {
        return HttpResponse.json({ userId: "alice-123" });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/users/v1/search/alice", {
      method: "GET",
      timeoutMs: 5000,
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ userId: "alice-123" });
  });

  it("forwards POST requests with body", async () => {
    mswServer.use(
      http.post(`${UPSTREAM}/users/v1/ban`, async ({ request }) => {
        const body = await request.json();
        return HttpResponse.json({ banned: true, user: (body as any).userId });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/users/v1/ban", {
      method: "POST",
      body: { userId: "alice" },
      timeoutMs: 5000,
    });

    expect(result.status).toBe(200);
    expect(result.data).toEqual({ banned: true, user: "alice" });
  });

  it("returns binary data when responseType is buffer", async () => {
    const imageBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
    mswServer.use(
      http.get(`${UPSTREAM}/avatars/v1/alice`, () => {
        return new HttpResponse(imageBytes, {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/avatars/v1/alice", {
      method: "GET",
      responseType: "buffer",
      timeoutMs: 5000,
    });

    expect(result.status).toBe(200);
    expect(Buffer.isBuffer(result.data)).toBe(true);
    expect((result.data as Buffer)[0]).toBe(0x89);
  });

  it("returns non-2xx status and body on upstream errors", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/users/v1/missing`, () => {
        return HttpResponse.json({ error: "not found" }, { status: 404 });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/users/v1/missing", {
      method: "GET",
      timeoutMs: 5000,
    });

    expect(result.status).toBe(404);
    expect(result.data).toEqual({ error: "not found" });
  });

  it("throws on timeout", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/slow`, async () => {
        await new Promise((r) => setTimeout(r, 5000));
        return HttpResponse.json({});
      }),
    );

    await expect(
      proxyToUpstream(UPSTREAM, "/slow", { method: "GET", timeoutMs: 50 }),
    ).rejects.toThrow();
  });

  it("throws on network error", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/network-error`, () => {
        return HttpResponse.error();
      }),
    );

    await expect(
      proxyToUpstream(UPSTREAM, "/network-error", { method: "GET", timeoutMs: 5000 }),
    ).rejects.toThrow();
  });

  it("forwards custom headers", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/auth-test`, ({ request }) => {
        const secret = request.headers.get("X-API-Secret");
        return HttpResponse.json({ secret });
      }),
    );

    const result = await proxyToUpstream(UPSTREAM, "/auth-test", {
      method: "GET",
      headers: { "X-API-Secret": "my-secret" },
      timeoutMs: 5000,
    });

    expect(result.data).toEqual({ secret: "my-secret" });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/proxy.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement proxy.ts**

`src/server/proxy.ts`:
```typescript
import { logger } from "./logger.js";

export interface ProxyOptions {
  method: string;
  body?: unknown;
  headers?: Record<string, string>;
  responseType?: "json" | "buffer";
  timeoutMs: number;
}

export interface ProxyResult {
  status: number;
  data: unknown;
}

/**
 * Forward a request to an upstream service.
 * Throws on network errors and timeouts.
 * Does NOT throw on non-2xx responses — returns status + body for the caller to handle.
 */
export async function proxyToUpstream(
  baseUrl: string,
  path: string,
  options: ProxyOptions,
): Promise<ProxyResult> {
  const url = `${baseUrl}${path}`;
  const log = logger.child({ upstream: url, method: options.method });

  const res = await fetch(url, {
    method: options.method,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(options.timeoutMs),
  });

  if (options.responseType === "buffer") {
    const buffer = Buffer.from(await res.arrayBuffer());
    return { status: res.status, data: buffer };
  }

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    log.warn({ status: res.status, data }, "upstream returned non-2xx");
  }

  return { status: res.status, data };
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/server/proxy.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/proxy.ts tests/server/proxy.test.ts
git commit -m "feat: add upstream proxy module with timeout and binary support"
```

---

## Task 7: Error Handling

**Files:**
- Create: `src/server/errors.ts`

- [ ] **Step 1: Implement errors.ts**

`src/server/errors.ts`:
```typescript
import type { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "./logger.js";

export class UpstreamError extends Error {
  public readonly statusCode: number;
  public readonly upstream: unknown;

  constructor(status: number, data: unknown) {
    super(`Upstream returned ${status}`);
    this.name = "UpstreamError";
    this.statusCode = status;
    this.upstream = data;
  }
}

export class ApiError extends Error {
  public readonly statusCode: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.statusCode = status;
  }
}

/**
 * Express error handling middleware. Must be registered last (4-arg signature).
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Validation error",
      details: err.errors,
    });
    return;
  }

  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof UpstreamError) {
    res.status(502).json({
      error: "Upstream service error",
      upstream: err.upstream,
    });
    return;
  }

  if (err.name === "AbortError" || err.name === "TimeoutError") {
    res.status(504).json({ error: "Upstream service timeout" });
    return;
  }

  if ((err as NodeJS.ErrnoException).code === "ECONNREFUSED") {
    res.status(503).json({ error: "Upstream service unavailable" });
    return;
  }

  // Unexpected error
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error" });
}
```

- [ ] **Step 2: Write error handler tests**

`tests/server/errors.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { ZodError } from "zod";
import { errorHandler, UpstreamError, ApiError } from "../../src/server/errors.js";

function createTestApp(thrower: () => never) {
  const app = express();
  app.get("/test", (_req, _res) => thrower());
  app.use(errorHandler);
  return app;
}

describe("errorHandler", () => {
  it("maps ZodError to 400", async () => {
    const app = createTestApp(() => {
      throw new ZodError([{ code: "custom", path: ["field"], message: "bad" }]);
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(400);
    expect(res.body.error).toBe("Validation error");
  });

  it("maps UpstreamError to 502", async () => {
    const app = createTestApp(() => {
      throw new UpstreamError(500, { message: "upstream down" });
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(502);
  });

  it("maps ApiError to its status code", async () => {
    const app = createTestApp(() => {
      throw new ApiError(403, "Forbidden");
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("Forbidden");
  });

  it("maps unknown errors to 500", async () => {
    const app = createTestApp(() => {
      throw new Error("oops");
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(500);
    expect(res.body.error).toBe("Internal server error");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/server/errors.test.ts
```
Expected: FAIL — `src/server/errors.ts` does not exist yet.

- [ ] **Step 4: (errors.ts was already implemented above)**

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/server/errors.test.ts
```
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/errors.ts tests/server/errors.test.ts
git commit -m "feat: add error classes and Express error middleware with tests"
```

---

## Task 8: Health Routes

**Files:**
- Create: `src/server/routes/health.ts`
- Create: `tests/server/routes/health.test.ts`

- [ ] **Step 1: Write health route tests**

`tests/server/routes/health.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import express from "express";
import request from "supertest";
import { createHealthRouter } from "../../../src/server/routes/health.js";

function createTestApp() {
  const app = express();
  app.use(createHealthRouter({ name: "admin", version: "2.0.0", description: "Admin panel" }));
  return app;
}

describe("health routes", () => {
  describe("GET /ping/:token", () => {
    it("responds with pong/{token}", async () => {
      const app = createTestApp();
      const res = await request(app).get("/ping/abc123");
      expect(res.status).toBe(200);
      expect(res.text).toBe("pong/abc123");
    });
  });

  describe("GET /about", () => {
    it("returns service info", async () => {
      const app = createTestApp();
      const res = await request(app).get("/about");
      expect(res.status).toBe(200);
      expect(res.body.type).toBe("admin");
      expect(res.body.version).toBe("2.0.0");
      expect(res.body.description).toBe("Admin panel");
      expect(res.body.hostname).toBeDefined();
      expect(res.body.startDate).toBeDefined();
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run tests/server/routes/health.test.ts
```
Expected: FAIL.

- [ ] **Step 3: Implement health.ts**

`src/server/routes/health.ts`:
```typescript
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run tests/server/routes/health.test.ts
```
Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/server/routes/health.ts tests/server/routes/health.test.ts
git commit -m "feat: add /ping and /about health endpoints with tests"
```

---

## Task 9: Mailer Module

**Files:**
- Create: `src/server/mailer.ts`
- Create: `src/server/routes/mail.ts`
- Create: `tests/server/routes/mail.test.ts`

- [ ] **Step 1: Implement mailer.ts**

`src/server/mailer.ts`:
```typescript
import nodemailer, { type Transporter } from "nodemailer";
import type { Config } from "./config.js";
import { logger } from "./logger.js";

export interface Mailer {
  sendMail(options: MailOptions): Promise<void>;
  enabled: boolean;
}

export interface MailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export function createMailer(config: Config): Mailer {
  if (!config.MAILER_HOST) {
    return {
      enabled: false,
      async sendMail() {
        throw new Error("Mailer is not configured (MAILER_HOST is missing)");
      },
    };
  }

  const transport: Transporter = nodemailer.createTransport({
    host: config.MAILER_HOST,
    port: config.MAILER_PORT,
    secure: config.MAILER_SECURE,
    ...(config.MAILER_USER && {
      auth: { user: config.MAILER_USER, pass: config.MAILER_PASSWORD },
    }),
  });

  const log = logger.child({ module: "mailer" });

  return {
    enabled: true,
    async sendMail(options: MailOptions) {
      const info = await transport.sendMail({
        from: config.MAILER_SEND_FROM,
        ...options,
      });
      log.info({ messageId: info.messageId }, "Email sent");
    },
  };
}
```

- [ ] **Step 2: Write mail route tests**

`tests/server/routes/mail.test.ts`:
```typescript
import { describe, it, expect, vi } from "vitest";
import express from "express";
import request from "supertest";
import { createMailRouter } from "../../../src/server/routes/mail.js";
import type { Mailer } from "../../../src/server/mailer.js";

function createTestApp(mailer: Mailer) {
  const app = express();
  app.use(express.json());
  app.use(createMailRouter(mailer, "noreply@test.com"));
  return app;
}

function mockMailer(): Mailer & { sendMail: ReturnType<typeof vi.fn> } {
  return {
    enabled: true,
    sendMail: vi.fn().mockResolvedValue(undefined),
  };
}

describe("POST /send-email", () => {
  it("sends email with valid body", async () => {
    const mailer = mockMailer();
    const app = createTestApp(mailer);

    const res = await request(app).post("/send-email").send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(mailer.sendMail).toHaveBeenCalledWith({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });
  });

  it("rejects missing 'to' field", async () => {
    const mailer = mockMailer();
    const app = createTestApp(mailer);

    const res = await request(app).post("/send-email").send({
      subject: "Test",
      text: "Hello",
    });

    expect(res.status).toBe(400);
    expect(mailer.sendMail).not.toHaveBeenCalled();
  });

  it("rejects invalid email address", async () => {
    const mailer = mockMailer();
    const app = createTestApp(mailer);

    const res = await request(app).post("/send-email").send({
      to: "not-an-email",
      subject: "Test",
      text: "Hello",
    });

    expect(res.status).toBe(400);
  });

  it("returns 503 when mailer is disabled", async () => {
    const mailer: Mailer = {
      enabled: false,
      async sendMail() {
        throw new Error("not configured");
      },
    };
    const app = createTestApp(mailer);

    const res = await request(app).post("/send-email").send({
      to: "user@example.com",
      subject: "Test",
      text: "Hello",
    });

    expect(res.status).toBe(503);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

```bash
npx vitest run tests/server/routes/mail.test.ts
```
Expected: FAIL.

- [ ] **Step 4: Implement mail route**

`src/server/routes/mail.ts`:
```typescript
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
      res.status(400).json({ error: "Validation error", details: parsed.error.errors });
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
```

- [ ] **Step 5: Run tests to verify they pass**

```bash
npx vitest run tests/server/routes/mail.test.ts
```
Expected: All tests PASS.

- [ ] **Step 6: Commit**

```bash
git add src/server/mailer.ts src/server/routes/mail.ts tests/server/routes/mail.test.ts
git commit -m "feat: add mailer module and email route with Zod validation"
```

---

## Task 10: Express App Shell

**Files:**
- Create: `src/server/app.ts`

This is the integration point. It assembles all modules into a working Express app.

- [ ] **Step 1: Implement app.ts**

`src/server/app.ts`:
```typescript
import express from "express";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import type { Config } from "./config.js";
import { createAuthModule } from "./auth.js";
import { createMailer } from "./mailer.js";
import { createHealthRouter } from "./routes/health.js";
import { createMailRouter } from "./routes/mail.js";
import { errorHandler } from "./errors.js";
import { logger } from "./logger.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface AppDeps {
  config: Config;
  pkg: { name: string; version: string; description: string; api: string };
}

export function createApp({ config, pkg }: AppDeps) {
  const app = express();
  const baseUrl = `/${pkg.api}`;
  const apiRoot = `${baseUrl}/api`;
  const webRoot = `${baseUrl}/web`;

  // --- Middleware ---
  app.use(helmet({ contentSecurityPolicy: false })); // CSP will be refined in Phase 2
  app.use(express.json({ limit: "50mb" }));
  app.use(cookieParser());
  app.use((req, _res, next) => {
    logger.debug({ method: req.method, url: req.originalUrl }, "request");
    next();
  });

  // --- Health (no auth) ---
  const healthRouter = createHealthRouter({
    name: pkg.name,
    version: pkg.version,
    description: pkg.description,
  });
  app.use("/", healthRouter);
  app.use(baseUrl, healthRouter);

  // --- Redirects ---
  const redirectToWeb = (_req: express.Request, res: express.Response) => res.redirect(webRoot);
  app.get("/", redirectToWeb);
  app.get(baseUrl, redirectToWeb);

  // --- Static / SPA ---
  const clientDist = path.resolve(__dirname, "../client");

  // Build injected HTML once at startup (config doesn't change at runtime)
  function buildIndexHtml(): string {
    const htmlPath = path.join(clientDist, "index.html");
    if (!fs.existsSync(htmlPath)) {
      return "<html><body>Admin panel (build not found — run npm run build)</body></html>";
    }

    // Derive available services: in monolith mode all are available,
    // in legacy mode only configured services are present.
    // TODO: Legacy per-service URL detection will be added when dual-backend
    // support is implemented. For now, if UPSTREAM_URL is set, all services
    // are considered available.
    const services = config.UPSTREAM_URL
      ? ["users", "usermeta", "avatars", "virtualcurrency", "data", "directory", "chat"]
      : []; // Legacy mode: will be derived from per-service env vars

    const configScript = `<script>window.__ADMIN_CONFIG__=${JSON.stringify({
      brandingTitle: config.BRANDING_TITLE,
      services,
      currencies: config.CURRENCY_CODES,
      chatRoomPrefix: config.CHAT_ROOM_PREFIX,
      userMetadataList: config.USER_METADATA_LIST,
    })};</script>`;

    return fs
      .readFileSync(htmlPath, "utf-8")
      .replace("<!--ADMIN_CONFIG-->", configScript)
      .replace("<!--BRANDING_TITLE-->", `${config.BRANDING_TITLE} Administration`);
  }

  const indexHtml = buildIndexHtml();

  app.use(webRoot, express.static(clientDist));
  // Express 5 wildcard: must use {*path} syntax (path-to-regexp v8)
  app.get(`${webRoot}/{*path}`, (_req, res) => {
    res.type("html").send(indexHtml);
  });

  // --- Auth ---
  const auth = createAuthModule({
    username: config.ADMIN_USERNAME,
    password: config.ADMIN_PASSWORD,
    isProduction: config.NODE_ENV === "production",
    sessionTtlMs: 604_800_000,
  });

  // Rate limit on login only — must be mounted BEFORE auth router
  const loginLimiter = rateLimit({
    windowMs: 60_000,
    max: 5,
    message: { error: "Too many login attempts, try again in a minute" },
  });
  app.post(`${apiRoot}/login`, loginLimiter);

  app.use(apiRoot, auth.router);

  // Everything below requires auth
  app.use(apiRoot, auth.validate);

  // --- islogged ---
  app.get(`${apiRoot}/islogged`, (_req, res) => {
    res.json({ success: true });
  });

  // --- Mailer ---
  const mailer = createMailer(config);
  app.use(apiRoot, createMailRouter(mailer, config.MAILER_SEND_FROM));

  // --- Placeholder for Phase 2+ API routes ---
  // app.use(`${apiRoot}/users`, usersRouter);
  // app.use(`${apiRoot}/items`, itemsRouter);
  // etc.

  // --- Error handler (must be last) ---
  app.use(errorHandler);

  return app;
}
```

- [ ] **Step 2: Verify compilation**

```bash
npx tsc --noEmit
```
Expected: No errors. If there are import resolution issues, fix `tsconfig.server.json` accordingly.

- [ ] **Step 3: Commit**

```bash
git add src/server/app.ts
git commit -m "feat: assemble Express app with auth, health, mail, static serving"
```

---

## Task 11: Entry Point

**Files:**
- Create: `src/server/index.ts`

- [ ] **Step 1: Implement index.ts**

`src/server/index.ts`:
```typescript
import { config } from "./config.js";
import { createApp } from "./app.js";
import { logger } from "./logger.js";

// Read package.json for app metadata
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, "../../package.json"), "utf-8"));

const app = createApp({ config, pkg });

function die(title: string) {
  return (err: unknown) => {
    logger.fatal({ err }, title);
    process.exit(1);
  };
}

process.on("uncaughtException", die("uncaughtException"));
process.on("unhandledRejection", die("unhandledRejection"));

logger.info({ config: { ...config, ADMIN_PASSWORD: "***", API_SECRET: "***" } }, "Starting");

app.listen(config.PORT, config.HOST, () => {
  logger.info(`App listening at http://${config.HOST}:${config.PORT}`);
});
```

- [ ] **Step 2: Verify server starts**

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=admin API_SECRET=test CURRENCY_CODES=gold \
  npx tsx src/server/index.ts
```
Expected: Server starts, logs config, listens on port 8000. `GET http://localhost:8000/ping/test` returns `pong/test`. Press Ctrl+C to stop.

- [ ] **Step 3: Commit**

```bash
git add src/server/index.ts
git commit -m "feat: add server entry point"
```

---

## Task 12: Dockerfile and Run Scripts

**Files:**
- Rename: `Dockerfile` → `Dockerfile.legacy`
- Create: `Dockerfile`
- Modify: `run-server.local.sh`

- [ ] **Step 1: Rename old Dockerfile**

```bash
mv Dockerfile Dockerfile.legacy
```

- [ ] **Step 2: Create new Dockerfile**

`Dockerfile`:
```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build:new

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8000/ping/healthcheck || exit 1
CMD ["node", "dist/server/index.js"]
```

- [ ] **Step 3: Update run-server.local.sh**

Replace the content with the simplified version using `UPSTREAM_URL`. Keep the daemon mode flag:

```bash
#!/bin/bash

# Run ganomede-admin in Docker, connected to the local triominos-server monolith.
# Requires: triominos-server running via docker-compose (port 38917)
#
# Usage: ./run-server.local.sh [-d]
#   -d  Run in daemon (detached) mode

DOCKER_RUN_OPTS="--rm"
while getopts "d" opt; do
  case $opt in
    d) DOCKER_RUN_OPTS="--rm -d" ;;
    *) echo "Usage: $0 [-d]" >&2; exit 1 ;;
  esac
done

docker build -t ganomede/admin:latest . || exit 1

# Stop previous instance if running
docker rm -f ganomede-admin 2>/dev/null

docker run $DOCKER_RUN_OPTS --name ganomede-admin \
  -p ${PORT:-1337}:8000 \
  -e UPSTREAM_URL=http://host.docker.internal:38917 \
  -e API_SECRET=local-dev-secret \
  -e ADMIN_USERNAME=admin \
  -e ADMIN_PASSWORD=admin \
  -e CURRENCY_CODES="triominos-gold,triominos-silver,triominos-bitmask" \
  -e CHAT_ROOM_PREFIX="triominos/v1" \
  -e BRANDING_TITLE="Triominos" \
  ganomede/admin:latest
```

- [ ] **Step 4: Verify Docker build**

```bash
docker build -t ganomede/admin:test .
```
Expected: Build succeeds. Image contains `dist/server/` and `dist/client/`.

- [ ] **Step 5: Commit**

```bash
git add Dockerfile Dockerfile.legacy run-server.local.sh
git commit -m "feat: add new Dockerfile and simplify run-server.local.sh with UPSTREAM_URL"
```

---

## Task 13: App Integration Tests & Verification

**Files:**
- Create: `tests/server/app.test.ts`

- [ ] **Step 1: Write app integration tests**

`tests/server/app.test.ts`:
```typescript
import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../../src/server/app.js";
import { parseConfig } from "../../src/server/config.js";

const config = parseConfig({
  ADMIN_USERNAME: "admin",
  ADMIN_PASSWORD: "secret",
  API_SECRET: "test",
  CURRENCY_CODES: "gold,silver",
  UPSTREAM_URL: "http://localhost:9999",
});

const pkg = { name: "admin", version: "2.0.0", description: "Test", api: "admin/v1" };

function createTestApp() {
  return createApp({ config, pkg });
}

describe("app integration", () => {
  it("GET /ping/:token returns pong", async () => {
    const res = await request(createTestApp()).get("/ping/test");
    expect(res.status).toBe(200);
    expect(res.text).toBe("pong/test");
  });

  it("GET /about returns service info", async () => {
    const res = await request(createTestApp()).get("/about");
    expect(res.status).toBe(200);
    expect(res.body.type).toBe("admin");
  });

  it("GET / redirects to /admin/v1/web", async () => {
    const res = await request(createTestApp()).get("/");
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe("/admin/v1/web");
  });

  it("GET /admin/v1/api/islogged returns 401 without auth", async () => {
    const res = await request(createTestApp()).get("/admin/v1/api/islogged");
    expect(res.status).toBe(401);
    expect(res.body.needAuthentication).toBe(true);
  });

  it("full auth flow: login → islogged → logout → islogged fails", async () => {
    const app = createTestApp();

    // Login
    const loginRes = await request(app)
      .post("/admin/v1/api/login")
      .send({ username: "admin", password: "secret" });
    expect(loginRes.status).toBe(200);
    const cookie = loginRes.headers["set-cookie"][0];

    // islogged succeeds
    const loggedRes = await request(app)
      .get("/admin/v1/api/islogged")
      .set("Cookie", cookie);
    expect(loggedRes.status).toBe(200);

    // Logout
    const logoutRes = await request(app)
      .post("/admin/v1/api/logout")
      .set("Cookie", cookie);
    expect(logoutRes.status).toBe(200);

    // islogged fails
    const failRes = await request(app)
      .get("/admin/v1/api/islogged")
      .set("Cookie", cookie);
    expect(failRes.status).toBe(401);
  });

  it("rate limits login attempts", async () => {
    const app = createTestApp();

    // Send 6 rapid login attempts (limit is 5/min)
    for (let i = 0; i < 5; i++) {
      await request(app)
        .post("/admin/v1/api/login")
        .send({ username: "admin", password: "wrong" });
    }

    const res = await request(app)
      .post("/admin/v1/api/login")
      .send({ username: "admin", password: "wrong" });
    expect(res.status).toBe(429);
  });
});
```

- [ ] **Step 2: Run tests to verify they pass**

```bash
npx vitest run tests/server/app.test.ts
```
Expected: All tests PASS.

- [ ] **Step 3: Commit**

```bash
git add tests/server/app.test.ts
git commit -m "test: add app-level integration tests"
```

- [ ] **Step 4: Run all tests**

```bash
npx vitest run
```
Expected: All tests pass (config, auth, proxy, health, mail).

- [ ] **Step 2: Run type checker**

```bash
npx tsc --noEmit
```
Expected: No errors.

- [ ] **Step 3: Start server and verify endpoints**

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=admin API_SECRET=test CURRENCY_CODES=gold \
  npx tsx src/server/index.ts &

# Health
curl http://localhost:8000/ping/test
# Expected: pong/test

curl http://localhost:8000/about
# Expected: JSON with type, version, hostname, startDate

# Auth flow
curl -X POST http://localhost:8000/admin/v1/api/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' -c cookies.txt
# Expected: {"success":true}

curl http://localhost:8000/admin/v1/api/islogged -b cookies.txt
# Expected: {"success":true}

curl -X POST http://localhost:8000/admin/v1/api/logout -b cookies.txt
# Expected: {"success":true}

# Redirect
curl -s -o /dev/null -w "%{redirect_url}" http://localhost:8000/
# Expected: redirects to /admin/v1/web

# Static serving (SPA fallback)
curl http://localhost:8000/admin/v1/web/
# Expected: HTML with __ADMIN_CONFIG__ injected

kill %1
rm cookies.txt
```

- [ ] **Step 4: Verify Vite dev server**

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=admin API_SECRET=test CURRENCY_CODES=gold \
  npm run dev
```
Expected: Both Vite (port 5173) and Express (port 8000) start. Opening `http://localhost:5173/admin/v1/web/` shows the placeholder React app. API calls to `/admin/v1/api/*` are proxied to the Express backend.

- [ ] **Step 5: Final commit (if any fixes needed)**

If any fixes were made during verification:
```bash
git add -A && git commit -m "fix: address integration issues from Phase 1 verification"
```

---

## Summary

After completing all 13 tasks, Phase 1 delivers:

| Component | Status |
|-----------|--------|
| TypeScript + Vite + ESLint + Prettier | Configured |
| Vitest + MSW + supertest | Configured with test helpers |
| Config (Zod, dual-backend) | Implemented + tested |
| Logger (Pino) | Implemented |
| Auth (random sessions, rate limiting) | Implemented + tested |
| Proxy (timeout, binary, headers) | Implemented + tested |
| Error handling middleware | Implemented + tested |
| Health endpoints (/ping, /about) | Implemented + tested |
| Mailer (Nodemailer, conditionally enabled) | Implemented + tested |
| Express app (helmet, static, HTML injection) | Implemented + integration tested |
| Entry point (index.ts) | Implemented |
| Dockerfile + run-server scripts | Updated |
| Frontend placeholder | Minimal HTML + React mount |

**Next:** Phase 2 — Frontend Foundation (React Router, TanStack Query, Tailwind, shadcn/ui, Layout, Login page, AuthGuard)
