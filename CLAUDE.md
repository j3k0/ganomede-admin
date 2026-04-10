# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

ganomede-admin is an internal admin panel for the Ganomede/Triominos platform. It provides support tools for managing users (search, ban/unban, password reset, virtual currency rewards), reviewing reports, viewing chat history, and editing game data. It acts as a proxy to upstream microservices (users, usermeta, virtualcurrency, avatars, chat, data, directory).

## Commands

```bash
# Install dependencies and build frontend bundle
make install

# Run server locally in Docker (requires triominos-server on port 38917)
./run-server.local.sh

# Run server against Triominos production (source credentials first)
source triominos-production.sh && ./run-server.triominos.sh

# Run server directly (requires env vars)
node index.js

# Run tests
npm test

# Run tests with watch mode
npm run testw

# Lint
npm run lint
npm run lintfix

# Build frontend (Vite — this is what the Dockerfile uses)
npm run build:new

# Vite dev server with HMR (port 5173, proxies API to :8000)
npx vite --config vite.config.ts

# Auto-restart server on backend changes
npx nodemon -w server/ index.js
```

Node version: 22 (TypeScript backend + Vite build require it). Ignore `.nvmrc` (refers to legacy code).

## Architecture

### Backend (src/server/) — active

TypeScript Express app. Entry point: `src/server/index.ts` → `src/server/app.ts`.
Build: `tsc -p tsconfig.server.json` → `dist/server/`

- **Base URL**: `/admin/v1` — API at `/admin/v1/api/*`, web UI at `/admin/v1/web/*`
- **Auth**: Passport Local strategy with SHA256 password hashing, cookie-based token auth (7-day expiry). Credentials from `ADMIN_USERNAME`/`ADMIN_PASSWORD` env vars.
- **Routes**: `src/server/routes/` — users, vcurrency, data, mail, health
- **Proxy layer**: `src/server/proxy.ts` — `proxyToUpstream()` forwards requests to upstream services
- **Config**: `src/server/config.ts` — Zod-validated env vars
- **Errors**: `src/server/errors.ts` — typed error classes (ApiError, UpstreamError)

### Backend (server/) — legacy, kept for reference

Original Node.js backend. Kept alongside `src/server/` during migration.

- **Upstream proxy pattern**: `Upstream` class (`server/utils.js`), instances in `server/upstreams.js`
- **User ID resolution**: `server/users/UserIdResolver.js`

### Frontend (src/client/) — active

React 18 + React Router + TanStack Query + Tailwind CSS, built with Vite. This is what the Dockerfile ships.

- **Entry**: `src/client/main.tsx`
- **Build**: `npm run build:new` (Vite + tsc) → `dist/client/`
- **API layer**: `src/client/lib/api.ts` (fetch wrapper), queries in `src/client/lib/queries/`
- **Pages**: `src/client/pages/` — user profile, chat, reports, data, items/packs

**Edit `src/client/` for frontend changes.** The `web/js/` files are the legacy frontend kept for reference (see below).

### Frontend (web/) — legacy, kept for reference

React 15 + Backbone single-page app. Kept as reference until all features are ported to the Vite frontend. The Browserify build (`make -C web`) is currently broken due to an ESM dependency.

- **Routing** (`web/js/router.js`): `/` (login), `/items`, `/packs`, `/users`, `/users/:username`, `/data`, `/reported`, `/chat`
- **API calls**: jQuery AJAX to `/admin/v1/api/*`

## Testing

Vitest with MSW for HTTP mocking. Tests in `tests/`.

```bash
npm test                                              # all tests (vitest)
npx vitest run tests/server/routes/users.test.ts      # single test file
npx vitest --watch                                    # watch mode
```

## Environment Variables

Required:
- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — Admin credentials
- `API_SECRET` — Secret for authenticating to upstream services

Service URLs follow Docker Compose pattern: `{SERVICE}_PORT_{PORT}_TCP_{ADDR|PORT|PROTOCOL}`. Services: `USERS`, `USERMETA`, `AVATARS`, `VIRTUAL_CURRENCY`, `DATA`, `DIRECTORY`, `CHAT`.

Other:
- `PORT` (default 8000), `HOST` (default 0.0.0.0)
- `BRANDING_TITLE` (default "Ganomede")
- `VIRTUAL_CURRENCY_CURRENCY_CODES` — Comma-separated currency codes
- `USER_METADATA_LIST` — Comma-separated metadata field names to display
- `CHAT_ROOM_PREFIX` — Chat room ID prefix (e.g., `triominos/v1`)

## Code Style

ESLint: ES2017, strict mode, no `var`, semicolons required, 2-space indent. Run `npm run lint` to check.

## Project Management

- `project-management/BACKLOG.md` — UX improvement backlog, prioritized by severity
