# Ganomede Admin Modernization Design

## Context

Ganomede-admin is an internal admin panel for the Triominos platform. It provides support tools for managing users, virtual currency, game data, reports, and chat. The current stack is severely outdated (React 15, Backbone, Browserify, Node 8) and needs a full rewrite.

This modernization happens in parallel with the rewrite of triominos-server as a monolith. The new triominos-server will expose all admin-facing APIs under a single base URL, replacing the current multi-service architecture (7+ separate microservices with Docker-style env vars).

### Current State

**Frontend:** React 15 + Backbone + jQuery + Browserify + Babel 6. Uses `React.createClass()`, string refs, `React.PropTypes`, Backbone models for data fetching. ~15 source files in `web/js/`.

**Backend:** Express 4 on Node 8. Proxies requests to upstream microservices via the `Upstream` class using the deprecated `request` library. Auth via Passport Local with SHA256 cookie tokens. ~12 source files in `server/`.

**Build:** Makefile-driven Browserify bundling. Dockerfile targets Node 14.

### Decision Record

- **Approach chosen:** Vite + React SPA + slim Express backend (Approach 1)
- **Rejected:** Next.js (SSR is wasted on an internal tool with one admin user), eliminate backend (would push auth/mailer scope into triominos-server rewrite)
- **TypeScript:** Yes, for both frontend and backend
- **Deployment:** Docker image, run via shell scripts (same pattern as today). Requires a running triominos-server.

## Architecture Overview

```
┌──────────────────┐         ┌──────────────────┐
│ ganomede-admin    │         │ triominos-server │
│ (Node 22, Docker) │────────│ (monolith)       │
│                   │         │ running on host  │
│  Express backend  │         │ or elsewhere     │
│  serves:          │         └──────────────────┘
│  - Static SPA     │
│  - /api/* proxy   │
│  - Auth           │
│  - Mailer         │
└──────────────────┘
```

The admin panel connects to a running triominos-server instance — it does not manage or orchestrate it. Connection is configured via `UPSTREAM_URL` (or legacy per-service env vars).

The admin panel remains a single Docker container serving both the compiled SPA and the API layer. The backend's role simplifies to:

1. **Auth** — login/logout with random session tokens, cookie-based
2. **Proxy** — forward authenticated `/api/*` requests to triominos-server (supports both single monolith URL and legacy per-service URLs for transition period)
3. **Mailer** — send emails via Nodemailer (stays here, not in triominos-server)
4. **Static serving** — serve the Vite-built SPA with `{{BRANDING_TITLE}}` injection

## Tech Stack

### Frontend

| Choice | Version | Replaces | Rationale |
|--------|---------|----------|-----------|
| React | 19 | React 15 | Current stable. Hooks replace createClass/Backbone bridge |
| React Router | 7 | React Router 2 | Current stable. Used for routing only — TanStack Query owns data fetching |
| sonner | latest | SweetAlert 1 | Toast notifications for success/error feedback. Pairs with shadcn/ui |
| TanStack Query | 5 | Backbone models + jQuery AJAX | Server state management with caching, retries, invalidation |
| Tailwind CSS | 4 | Bootstrap 3 (via CDN) + custom CSS | Utility-first, no runtime, works well with component architecture |
| shadcn/ui | latest | Custom Bootstrap components | Accessible, unstyled component primitives (dialogs, tables, forms). Not a dependency — components are copied into the project |
| Vite | 6 | Browserify + Babel 6 + Makefile | Fast dev server with HMR, native ES modules, built-in TypeScript |
| date-fns | 4 | Moment.js | Tree-shakeable, immutable, smaller bundle |
| CodeMirror | 6 | CodeMirror 5 | Modern rewrite, better extensibility |

**Not included (YAGNI):**
- Zustand/Redux — TanStack Query handles server state; the app has minimal client-only state (search input, form values). React's built-in `useState` suffices.
- Form library — The forms are simple (login, search, award, password reset). Native form handling + controlled components is enough.
- i18n library — The UI is English-only (mail templates are hardcoded, not user-facing).

### Backend

| Choice | Version | Replaces | Rationale |
|--------|---------|----------|-----------|
| Node.js | 22 LTS | Node 8 / 14 | Current LTS, native fetch, modern ES features |
| Express | 5 | Express 4 | Stable release, async error handling, same familiar API |
| Zod | 3 | No validation | Runtime validation for API inputs and env config |
| Pino | 9 | Bunyan | Same structured JSON logging philosophy, actively maintained |
| Nodemailer | 6 | Nodemailer 6 | Already current, keep as-is |
| helmet | 8 | Nothing | Security headers (CSP, X-Frame-Options, HSTS, etc.) |
| express-rate-limit | 7 | Nothing | Rate limiting on login endpoint |

**Removed dependencies:**
- `request` library (deprecated) — replaced by native `fetch` (Node 22)
- `passport` + `passport-local` — overkill for single-user auth. Simple custom middleware with random session tokens.
- `body-parser`, `cookie-parser`, `serve-favicon` — built into Express 5 or trivially replaced
- `async`, `awaitability` — native async/await
- All Backbone, jQuery, Browserify, Babel dependencies

### Testing

| Choice | Replaces | Rationale |
|--------|----------|-----------|
| Vitest | Mocha 5 + Chai | Vite-native, fast, Jest-compatible API, built-in coverage |
| React Testing Library | Nothing (no frontend tests existed) | Standard for testing React components |
| MSW (Mock Service Worker) | Nothing | Mock API responses in tests without coupling to implementation |

### Tooling

| Choice | Replaces | Rationale |
|--------|----------|-----------|
| TypeScript | 5.8 | JavaScript | Type safety for both frontend and backend |
| ESLint | 9 (flat config) | ESLint 4 | Current, with typescript-eslint plugin |
| Prettier | 3 | None | Consistent formatting, no debates |

## Directory Structure

```
ganomede-admin/
├── src/
│   ├── server/                    # Backend (Express + TypeScript)
│   │   ├── index.ts               # Entry point: creates and starts server
│   │   ├── app.ts                 # Express app setup, middleware, routes
│   │   ├── config.ts              # Env var parsing with Zod
│   │   ├── auth.ts                # Login/logout/validate middleware
│   │   ├── proxy.ts               # Upstream proxy (supports single URL or per-service URLs)
│   │   ├── mailer.ts              # Email sending via Nodemailer
│   │   ├── logger.ts              # Pino logger setup
│   │   └── routes/
│   │       ├── health.ts          # /ping and /about endpoints
│   │       ├── users.ts           # User search, profile, ban, rewards, password reset
│   │       ├── vcurrency.ts       # Items and packs CRUD
│   │       ├── data.ts            # Data documents
│   │       ├── chat.ts            # Chat history
│   │       ├── reports.ts         # Reported users
│   │       └── mail.ts            # Email sending endpoint (with Zod validation)
│   │
│   └── client/                    # Frontend (Vite + React + TypeScript)
│       ├── index.html             # HTML shell (Vite entry)
│       ├── main.tsx               # React root mount
│       ├── router.tsx             # React Router configuration
│       ├── lib/
│       │   ├── api.ts             # API client (fetch wrapper, auth handling)
│       │   ├── queries/           # TanStack Query hooks, split by domain
│       │   │   ├── users.ts       # useUserSearch, useUserProfile, useBan, useAward, etc.
│       │   │   ├── vcurrency.ts   # useItems, usePacks, etc.
│       │   │   ├── data.ts        # useDataDocs, useDataDoc, etc.
│       │   │   └── chat.ts        # useChatRoom, etc.
│       │   └── utils.ts           # Shared utilities (date formatting, password generator, etc.)
│       ├── components/
│       │   ├── Layout.tsx         # App shell: navbar, outlet
│       │   ├── AuthGuard.tsx      # Checks auth state, redirects to login if needed
│       │   ├── ErrorBoundary.tsx  # Top-level error boundary (catch render crashes)
│       │   ├── Loader.tsx         # Loading/error state wrapper
│       │   ├── JsonEditor.tsx     # CodeMirror 6 JSON editor
│       │   └── BackupRestore.tsx  # Shared backup/restore with progress (used by Items, Packs, Data)
│       ├── pages/
│       │   ├── Login.tsx          # Login form
│       │   ├── users/             # User pages (split for manageability)
│       │   │   ├── Users.tsx      # Search form + results + routing
│       │   │   ├── UserProfile.tsx    # Profile layout (avatar, header, actions, metadata)
│       │   │   ├── Transactions.tsx   # Transaction table with grouping and running balance
│       │   │   ├── ReportsBlocks.tsx  # Reports and blocks display
│       │   │   └── EmailDialog.tsx    # Multi-step email sending flow
│       │   ├── Items.tsx          # Virtual currency items (inline costs editing, not JSON editor)
│       │   ├── Packs.tsx          # Virtual currency packs (inline editing)
│       │   ├── Data.tsx           # Data document editor (JSON editor, CSV import, backup/restore)
│       │   ├── Chat.tsx           # Chat history viewer
│       │   ├── Reports.tsx        # Most-reported users
│       │   └── NotFound.tsx       # 404 catch-all
│       └── styles/
│           └── globals.css        # Tailwind directives + any custom CSS
│
├── tests/
│   ├── server/                    # Backend tests
│   │   ├── auth.test.ts
│   │   ├── proxy.test.ts
│   │   └── routes/
│   │       └── users.test.ts
│   └── client/                    # Frontend tests
│       ├── pages/
│       │   └── Users.test.tsx
│       └── setup.ts               # Test setup (MSW handlers, etc.)
│
├── vite.config.ts                 # Vite config (dev proxy to backend, build output)
├── tsconfig.json                  # Shared TS config
├── tsconfig.server.json           # Server-specific TS config (Node target)
├── eslint.config.ts               # ESLint flat config
├── Dockerfile                     # Multi-stage: build frontend + run backend
├── run-server.local.sh            # Run against local triominos-server
├── run-server.triominos.sh        # Run against production triominos-server
├── package.json
└── .nvmrc                         # Node 22
```

## Frontend Architecture

### Routing

React Router 7 used for routing only (not its loader/action data features — TanStack Query handles data). All routes are protected via `AuthGuard` except `/login`. A top-level `ErrorBoundary` catches unhandled render errors.

```tsx
// src/client/router.tsx
const router = createBrowserRouter([
  {
    path: "/admin/v1/web",
    errorElement: <ErrorBoundary />,
    children: [
      { path: "login", element: <Login /> },
      {
        element: <AuthGuard />,   // checks GET /api/islogged, redirects to login on 401
        children: [
          {
            element: <Layout />,  // navbar with dynamic menu, <Outlet />
            children: [
              { index: true, element: <Navigate to="users" /> },
              { path: "users", element: <Users /> },
              { path: "users/:username", element: <Users /> },
              { path: "items", element: <Items /> },
              { path: "packs", element: <Packs /> },
              { path: "data", element: <Data /> },
              { path: "data/:docId", element: <Data /> },
              { path: "reported", element: <Reports /> },
              { path: "chat", element: <Chat /> },
              { path: "chat/:username1,:username2", element: <Chat /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
```

### Data Fetching

TanStack Query replaces the Backbone models + jQuery AJAX pattern. Query hooks are organized by domain in `lib/queries/`.

**Query key factory pattern** to ensure consistent keys and targeted invalidation:

```tsx
// src/client/lib/queries/users.ts
export const userKeys = {
  all: ["users"] as const,
  search: (query: string) => [...userKeys.all, "search", query] as const,
  detail: (username: string) => [...userKeys.all, username] as const,
  reportsBlocks: (username: string) => [...userKeys.all, username, "reports-blocks"] as const,
};

export function useUserSearch(query: string) {
  return useQuery({
    queryKey: userKeys.search(query),
    queryFn: () => api.get<SearchResult>(`/users/search/${encodeURIComponent(query)}`),
    enabled: !!query,
  });
}

export function useUserProfile(username: string) {
  return useQuery({
    queryKey: userKeys.detail(username),
    queryFn: () => api.get<UserProfile>(`/users/${encodeURIComponent(username)}`),
    enabled: !!username,
  });
}
```

**Default QueryClient config:** `staleTime: 30_000` (30s) to avoid refetching on every focus event — reasonable for a single-admin tool.

**Mutations** (award, ban, password reset) use `useMutation` with targeted query invalidation. For example, awarding currency invalidates `userKeys.detail(username)` to refresh balance and transactions. The profile endpoint returns a composite object (like the current backend), so one invalidation refreshes everything — matching current behavior.

### API Client

A thin `fetch` wrapper that handles:
- Base URL prefixing (`/admin/v1/api`)
- JSON serialization/deserialization
- 401 responses → redirect to login page
- Error normalization

```tsx
// src/client/lib/api.ts
async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/admin/v1/api${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });

  if (res.status === 401) {
    window.location.href = "/admin/v1/web/login";
    throw new Error("Unauthorized");
  }

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, error);
  }

  return res.json();
}
```

### Auth State

Simple React context that tracks login state. On mount, the app calls `GET /api/islogged` — if 401, show login page. No complex auth state machine needed for a single-admin tool.

### UI Components

**shadcn/ui components needed** (copied into project, not a node_modules dependency):
- `Button`, `Input`, `Select` — forms everywhere
- `Table` — transactions, reported users, items, packs
- `Dialog` / `AlertDialog` — confirmations, prompts, detail views
- `Card` — user profile, chat messages
- `Tabs` — Data page (Create / CSV Import / Restore)
- `Badge` — ban status display
- `Progress` — backup/restore progress bars

**SweetAlert replacement mapping** (the current app uses 6 distinct SweetAlert patterns):

| Current Pattern | Example | Replacement |
|----------------|---------|-------------|
| Confirmation dialogs | Ban/unban, delete document | shadcn `AlertDialog` |
| Input prompts | Password reset (with generated suggestion), add new item ID | shadcn `Dialog` with form inputs |
| Success notifications | Award sent, password changed | `sonner` toast |
| Error notifications | API failures with error detail | `sonner` error toast |
| Detail popups | Click transaction row → full JSON | shadcn `Dialog` or `Sheet` |
| Multi-step modal flow | Send email: select template → select locale → preview/edit → send | Stepped `Dialog` with internal state (replaces chained `swal()` + jQuery `x-editable`) |

**Other replacements:**
- Bootstrap 3 classes → Tailwind utilities
- jQuery-based inline editing → controlled React forms
- `password-generator` package → simple utility function in `lib/utils.ts` for password suggestions during reset

The navbar dynamically shows menu items based on available services (same behavior as current `app.jsx` checking `window.REACT_INITIAL_STATE.services`). The server injects available services into the HTML as a JSON script tag.

## Backend Architecture

### Config (Dual-Backend Support)

The config supports **two modes** to decouple the admin panel rewrite from the monolith rewrite timeline:

1. **Monolith mode:** Set `UPSTREAM_URL` to a single base URL (target state)
2. **Legacy mode:** Set per-service Docker-style env vars like `USERS_PORT_8080_TCP_ADDR` (transition period)

If `UPSTREAM_URL` is set, it takes precedence. Otherwise, the config falls back to parsing individual service URLs. This eliminates a hard dependency between the two rewrites.

```typescript
// src/server/config.ts
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(8000),
  HOST: z.string().default("0.0.0.0"),
  ADMIN_USERNAME: z.string().min(1),
  ADMIN_PASSWORD: z.string().min(1),
  API_SECRET: z.string().min(1),
  UPSTREAM_URL: z.string().url()               // Single upstream: e.g. http://triominos-server:8080
    .refine(s => s.startsWith("http://") || s.startsWith("https://"),
      "UPSTREAM_URL must be an HTTP(S) URL")
    .optional(),                               // Optional: if absent, falls back to per-service URLs
  BRANDING_TITLE: z.string().default("Ganomede"),
  CURRENCY_CODES: z.string({ required_error: "CURRENCY_CODES env var is required (comma-separated)" })
    .min(1).transform(s => s.split(",")),
  USER_METADATA_LIST: z.string().default("").transform(s => s ? s.split(",") : []),
  CHAT_ROOM_PREFIX: z.string().default(""),
  UPSTREAM_TIMEOUT_MS: z.coerce.number().default(30_000),

  // Mailer config (all optional — if MAILER_HOST is absent, mailer is disabled)
  MAILER_HOST: z.string().optional(),
  MAILER_PORT: z.coerce.number().default(587),
  MAILER_SECURE: z.string().transform(s => s === "true").default("false"),
  MAILER_USER: z.string().optional(),
  MAILER_PASSWORD: z.string().optional(),
  MAILER_SEND_FROM: z.string().default("noreply@ganomede.com"),
});

export const config = envSchema.parse(process.env);
```

**Note on API secret forwarding:** The current codebase injects `API_SECRET` in different ways per upstream service (URL path segment, request body field, query parameter). The proxy must handle this per-route until the monolith standardizes on a single auth mechanism (e.g., `Authorization: Bearer` header). This is documented in the proxy section below.

### Proxy

The `Upstream` class (80 lines, using deprecated `request`) is replaced by a proxy module using native `fetch` with:
- **Configurable timeout** via `AbortSignal.timeout()` (default 30s)
- **Binary response support** for avatar images (fetched as buffers, returned as base64 data URIs — same as current `helpers.js`)
- **Per-route API secret injection** until the monolith standardizes auth

```typescript
// src/server/proxy.ts
export async function proxyToUpstream(
  path: string,
  options: {
    method: string;
    body?: unknown;
    headers?: Record<string, string>;
    responseType?: "json" | "buffer";
  }
): Promise<{ status: number; data: unknown }> {
  const baseUrl = resolveUpstreamUrl(path); // uses UPSTREAM_URL or per-service fallback
  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    signal: AbortSignal.timeout(config.UPSTREAM_TIMEOUT_MS),
  });

  if (options.responseType === "buffer") {
    const buffer = await res.arrayBuffer();
    return { status: res.status, data: Buffer.from(buffer) };
  }

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}
```

Route handlers inject `API_SECRET` in the appropriate format per upstream API (body field, URL segment, or query param) until the monolith provides a unified auth header.

### Auth

Replaces the current static SHA256 token (which never rotates and remains valid even after logout) with **random session tokens**:

- On login: validate credentials, generate `crypto.randomUUID()`, store in a server-side `Map<token, { createdAt: number }>`, set as cookie
- On logout: delete token from the map, clear cookie
- Validate middleware: check cookie token exists in the map and is not expired (7-day TTL)
- Server restart clears all sessions (acceptable for a single-admin tool)

**Cookie security flags:**
```typescript
res.cookie("token", sessionToken, {
  path: "/",
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",    // CSRF protection for same-site context
  maxAge: 604_800_000, // 7 days
});
```

**Rate limiting:** `express-rate-limit` on the login endpoint — 5 attempts per minute, then 429. Prevents brute-force attacks.

**Security headers:** `helmet` middleware with CSP configured to allow Vite-built assets and the inline `__ADMIN_CONFIG__` script (via nonce).

### Routes

Each route file exports an Express Router. Route handlers are thin: validate input with Zod, call the proxy, transform response if needed, send JSON. The `users` routes are the most complex (search, profile aggregation, ban, rewards, password reset, chat, reports) but follow the same pattern.

**Email endpoint validation:** The `POST /send-email` route validates the request body with Zod, restricting `from` to the configured `MAILER_SEND_FROM` value and `to` to a valid email address. This prevents the endpoint from being used as an arbitrary email relay.

### Error Handling

Comprehensive Express error middleware replacing the current single-case `UpstreamError` handler:

| Error Type | HTTP Status | Response |
|------------|-------------|----------|
| `ZodError` (validation) | 400 | Field-level error details |
| Upstream HTTP errors | 502 | Gateway error (not 500 — this is a proxy) |
| `AbortError` / timeout | 504 | Gateway timeout |
| Network errors (ECONNREFUSED) | 503 | Service unavailable |
| Unexpected errors | 500 | Generic message; full details logged via Pino |

**Body size limit:** Express JSON parser configured with `limit: "50mb"` to support large batch data operations (current behavior).

### Static Serving & HTML Injection

Express serves the Vite build output from `dist/client/`. The `index.html` has a `<script>` tag placeholder that gets replaced server-side with:

```html
<script>
  window.__ADMIN_CONFIG__ = {
    brandingTitle: "Triominos",
    services: ["users", "virtualcurrency", "data", "chat"],
    currencies: ["gold", "gems"],
    chatRoomPrefix: "triominos/v1"
  };
</script>
```

This replaces the current `{{REACT_INITIAL_STATE}}` mechanism.

## Build & Deployment

### Development

```bash
# Single command (recommended):
npm run dev            # concurrently runs both client and server

# Or separately:
npm run dev:client     # vite --port 5173
npm run dev:server     # tsx watch src/server/index.ts
```

Vite's dev proxy eliminates CORS issues during development:

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    proxy: {
      "/admin/v1/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
});
```

### Production Build

```bash
npm run build          # Runs both:
                       #   vite build → dist/client/
                       #   tsc + tsx build → dist/server/
```

### Dockerfile

```dockerfile
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev
USER node
EXPOSE 8000
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:8000/ping || exit 1
CMD ["node", "dist/server/index.js"]
```

### Run Scripts

Keep the existing `run-server.local.sh` / `run-server.triominos.sh` pattern. The scripts build the Docker image and run it with the appropriate env vars. With `UPSTREAM_URL`, the local script simplifies dramatically:

```bash
# run-server.local.sh (new — replaces 20+ per-service env vars with one URL)
docker build -t ganomede/admin:latest . || exit 1
docker rm -f ganomede-admin 2>/dev/null

docker run --rm --name ganomede-admin \
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

The production variant (`run-server.triominos.sh`) sources credentials from a separate file and points `UPSTREAM_URL` at the production triominos-server.

**Prerequisite:** A triominos-server instance must be running and accessible at the configured URL.

## Testing Strategy

Tests are written per-phase (see Implementation Phases), not deferred.

### Backend Tests (Vitest + supertest)

- **Unit tests** for config validation, auth (session lifecycle, rate limiting), proxy (timeout, error mapping)
- **Integration tests** for route handlers using `supertest` against the Express app with MSW intercepting upstream calls
- **Coverage target:** Auth and proxy must have full coverage. Route handlers covered via integration tests.

### Frontend Tests (Vitest + React Testing Library + MSW)

- **Component tests** for pages with meaningful logic: Users (search + profile + award), Data (JSON editor save, CSV import), Items/Packs (CRUD + backup/restore)
- **MSW** provides mock API responses — tests are decoupled from the backend

### E2E Smoke Tests (Playwright)

A minimal Playwright suite added in Phase 2 (framework) and expanded through Phase 6:
- Log in
- Navigate to each page, verify it renders without errors
- Perform one core action (search a user, create an item)

This is not comprehensive E2E testing — it's a safety net for a rewrite where feature parity is the primary risk.

### Scripts

```json
{
  "scripts": {
    "dev": "concurrently \"npm:dev:client\" \"npm:dev:server\"",
    "dev:client": "vite --port 5173",
    "dev:server": "tsx watch src/server/index.ts",
    "build": "vite build && tsc -p tsconfig.server.json",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "lint": "eslint .",
    "typecheck": "tsc --noEmit"
  }
}
```

## Migration Strategy

This is a **full rewrite**, not an incremental migration. Rationale:

1. The gap is too large for incremental upgrades (React 15 `createClass` → React 19 hooks requires going through 3 intermediate versions, each with breaking changes)
2. Backbone removal touches every component
3. The build system (Browserify + Babel 6) can't be partially upgraded
4. The app is small (~15 frontend files, ~12 backend files) — a rewrite is faster than a multi-step migration
5. The backend simplifies dramatically (7 upstreams → 1 URL), making a rewrite cleaner than adapting the old proxy layer

### Feature Parity Checklist

Every feature in the current app must exist in the rewrite:

**Auth & Navigation:**
- [ ] Login/logout with cookie-based session auth
- [ ] Dynamic navbar based on available services
- [ ] Branding title injection
- [ ] Redirect from `/` and `/admin/v1` to web UI
- [ ] `GET /api/islogged` endpoint for frontend auth check
- [ ] `/ping` and `/about` health endpoints

**Users:**
- [ ] User search (by ID, email, or tag via directory service, including `ganomede-tagizer` normalization)
- [ ] User profile (avatar as base64 data URI, directory info, metadata, ban status, last auth date)
- [ ] User actions: ban/unban, password reset (with auto-generated password suggestion), award currency
- [ ] Email sending: template selection, locale auto-detection, inline subject/body editing, `{username}` substitution, multi-step dialog flow
- [ ] Reports and blocks display per user (with links to chat, count badges)
- [ ] User metadata: view and edit metadata fields
- [ ] Transaction history: grouped by currency, running balance computation, sorted display, click-for-detail

**Virtual Currency:**
- [ ] Items list: CRUD with inline costs editing (CostsTable pattern, not JSON editor)
- [ ] Items: "Add New Item" flow with ID prompt (displayId vs id distinction)
- [ ] Items: backup and restore with progress bar
- [ ] Packs list: CRUD with inline editing
- [ ] Packs: backup and restore with progress bar

**Data:**
- [ ] Data documents: list, view, edit with CodeMirror JSON editor
- [ ] Data: create new document
- [ ] Data: CSV file import with column validation, duplicate detection, and warnings
- [ ] Data: backup and restore with progress bar

**Chat & Reports:**
- [ ] Chat: view chat history between two users (with `$$` system message special rendering)
- [ ] Chat: debounced room search
- [ ] Reported users: list most-reported users (sorted by report count)

### What Stays the Same

- URL structure (`/admin/v1/web/*`, `/admin/v1/api/*`)
- Overall page layout and navigation concept
- API contract with triominos-server (the upstream API paths like `/users/v1/...` stay the same, just under one host)
- Cookie-based auth pattern (but implementation changes from static SHA256 to random session tokens)

### What Changes

- Every dependency
- CommonJS → ES modules
- JavaScript → TypeScript
- 7 upstream URLs → 1 `UPSTREAM_URL`
- Backbone models → TanStack Query
- jQuery AJAX → native fetch
- SweetAlert prompts → React Dialog components
- Browserify → Vite
- Bootstrap 3 → Tailwind CSS + shadcn/ui
- Class components → functional components with hooks

## Implementation Phases

Tests are written alongside code in each phase, not deferred to the end. Each phase ends with a verification checkpoint.

### Phase 1: Project Skeleton & Backend Core

Set up the new project structure alongside the old code (new code in `src/`, old code untouched):
- Initialize TypeScript, Vite, ESLint, Prettier, `concurrently` configs
- Set up `src/server/` and `src/client/` directory structure
- Configure Vitest with MSW
- Implement `config.ts` with Zod validation (dual-backend support)
- Implement `auth.ts` (random session tokens, rate limiting, cookie security)
- Implement `proxy.ts` (timeout, binary support, per-route secret injection)
- Implement `logger.ts` (Pino)
- Implement error handling middleware
- Implement `health.ts` (`/ping`, `/about`)
- Implement `mailer.ts` (Nodemailer, conditionally enabled)
- Implement Express app shell with `helmet`, static serving, HTML injection
- Create Dockerfile and update run-server scripts
- **Tests:** config validation, auth (login/logout/session expiry/rate limiting), proxy (timeout, error handling), health endpoints
- **Verify:** backend starts, serves placeholder HTML, auth works, health endpoints respond

### Phase 2: Frontend Foundation

- Set up React 19 + React Router 7 + TanStack Query + Tailwind + shadcn/ui
- Create `ErrorBoundary`, `AuthGuard`, `Layout` (navbar with dynamic menu)
- Create API client (`lib/api.ts`) with auth redirect
- Set up `sonner` toast provider
- Implement Login page
- Configure Playwright for smoke tests (framework only — run against each page as it's built)
- **Tests:** AuthGuard redirect behavior, Layout rendering
- **Verify:** can log in, see navbar, navigate between placeholder pages

### Phase 3: Core Pages — Users

The most complex area. Implement in sub-steps:
- Backend: user routes (search, profile aggregation, ban, rewards, password reset, reports-blocks)
- User search (search input → resolve via directory → show results)
- User profile (avatar, directory info, metadata, ban status, last auth)
- User actions: ban/unban with `AlertDialog` confirmation
- Password reset with auto-generated suggestion in `Dialog`
- Award form with currency selector, confirmation dialog, success toast
- Email sending: multi-step `Dialog` (template → locale → preview/edit → send)
- Reports and blocks display with chat links
- User metadata editing (inline save)
- Transaction history (grouped by currency, running balance, click-for-detail)
- **Tests:** user search flow, profile rendering, award mutation + invalidation
- **Verify:** full user workflow against running old version

### Phase 4: Virtual Currency Pages

- Backend: vcurrency routes (items CRUD, packs CRUD)
- Items list with inline costs editing (CostsTable pattern) and "Add New Item" flow
- Packs list with inline editing
- Shared `BackupRestore` component with progress bar (used here and in Phase 5)
- Items and Packs backup/restore
- **Tests:** Items CRUD, backup/restore progress
- **Verify:** create, edit, delete items and packs; backup and restore roundtrip

### Phase 5: Data, Chat, Reports Pages

- Backend: data routes, chat routes, reports route, mail route
- Data documents: list, view, edit with CodeMirror 6 JSON editor
- Data: create new document, CSV import (column validation, duplicate detection, warnings)
- Data: backup/restore (reuse `BackupRestore` component)
- Chat history viewer (room selection, debounced search, `$$` system message rendering)
- Reported users list (sorted by report count)
- **Tests:** JSON editor save, CSV import parsing, chat rendering
- **Verify:** all Data tabs work, chat displays correctly, reported users list loads

### Phase 6: Integration, Polish & Cutover

- Run full feature parity checklist: side-by-side walkthrough of every screen on old vs new
- Playwright smoke tests: log in, navigate every page, verify no crashes
- Docker build and compose verification (including health checks)
- Update CLAUDE.md, .nvmrc, package.json scripts
- **Do NOT remove old code yet** — see Cutover & Rollback Plan below

## Cutover & Rollback Plan

This is a rewrite running alongside the old code. The old system continues running in production until cutover.

### During Development

- New code lives in `src/`. Old code (`web/`, `server/`, `config.js`, `index.js`) is untouched.
- The old Dockerfile is renamed to `Dockerfile.legacy`. The new Dockerfile builds from `src/`.
- Both can be built and run independently. Production runs the old image until cutover.

### Cutover Gate (Phase 6)

Before switching production to the new image, ALL of these must pass:
1. Full feature parity checklist verified via side-by-side walkthrough
2. All unit/integration tests pass
3. Playwright smoke tests pass
4. Docker image builds and starts correctly with health checks passing
5. Run the new image against the real upstream (staging) for at least a day

### After Cutover

- Old code is **NOT removed** until the new admin panel has run in production for at least 2 weeks
- Rollback = deploy the previous Docker image (old code). No data migration needed — the admin panel is stateless.
- After the 2-week stabilization period: remove old code, old Dockerfile, old configs in a clean-up commit

### Dual-Backend Transition

The admin panel supports both `UPSTREAM_URL` (monolith) and per-service env vars (legacy). This means:
- If the monolith ships first → set `UPSTREAM_URL`, done
- If the admin panel ships first → use per-service env vars against existing microservices
- Neither rewrite blocks the other

## Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Monolith API paths differ from current microservice paths | Proxy supports per-route path mapping. Dual-backend config allows running against either setup. Coordinate with monolith team on API surface. |
| Feature parity gaps discovered late | Expanded checklist (30+ items). Per-phase verification against running old version. Playwright smoke tests. |
| Rewrite takes longer than expected | Old code runs unchanged in production. No deadline pressure — cutover happens when ready. Per-phase checkpoints surface delays early. |
| `ganomede-directory` / `ganomede-tagizer` dependencies | If monolith provides a new user resolution API, these become unnecessary. If not, reimplement the tagizer normalization rules in TypeScript (small, well-defined logic). |
| CodeMirror 6 API is very different from v5 | CodeMirror 6 has good docs. The JSON editor is a self-contained component — limited blast radius. |
| Express 5 ecosystem maturity | Express 5 is stable since late 2024. For a small internal app with ~5 route files, ecosystem risk is low. Fallback to Express 4 is trivial if needed. |
