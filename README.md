# ganomede-admin

Administration panel for Ganomede/Triominos.

## Quick Start

    # Build Docker image and run locally (requires triominos-server on port 38917)
    ./run-server.local.sh

Navigate to http://localhost:1337 — login with `admin`/`admin`.

## Development

Requires Node.js 22+.

    npm install               # Install dependencies
    npm run dev               # Vite dev server + Express backend (auto-reload)
    npm test                  # Run tests (vitest)
    npm run lint              # Lint (eslint)
    npm run typecheck         # Type-check (tsc --noEmit)
    npm run build             # Production build (Vite + tsc)

The dev server runs the Vite frontend on port 5173 (proxying API calls to port 8000) and the Express backend on port 8000.

## Docker

    docker build -t ganomede/admin:latest .

Or use the helpers:

    ./run-server.local.sh      # Build + run against local triominos-server
    ./run-server.triominos.sh  # Run against Triominos production (source credentials first)

## Environment Variables

- `ADMIN_USERNAME`, `ADMIN_PASSWORD` — Admin credentials
- `API_SECRET` — Secret for authenticating to upstream services
- `PORT` (default 8000), `HOST` (default 0.0.0.0)
- `BRANDING_TITLE` (default "Ganomede")
- `VIRTUAL_CURRENCY_CURRENCY_CODES` — Comma-separated currency codes
- `USER_METADATA_LIST` — Comma-separated metadata field names to display
- `CHAT_ROOM_PREFIX` — Chat room ID prefix (e.g., `triominos/v1`)

Upstream service URLs use Docker Compose pattern: `{SERVICE}_PORT_{PORT}_TCP_{ADDR|PORT|PROTOCOL}`.
Services: `USERS`, `USERMETA`, `AVATARS`, `VIRTUAL_CURRENCY`, `DATA`, `DIRECTORY`, `CHAT`.

## License

(c) 2015, Fovea. All rights reserved.
