# Phase 2: Frontend Foundation — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Set up the React 19 frontend with routing, auth, layout, API client, and login page — producing a working app where you can log in and see the navbar with placeholder pages.

**Architecture:** React Router 7 for routing (routing only, not data loaders), TanStack Query 5 for server state, Tailwind CSS 4 for styling, shadcn/ui for component primitives. The frontend reads `window.__ADMIN_CONFIG__` injected by the server for services list and branding. Auth state is managed via a simple `GET /api/islogged` check — if 401, redirect to login.

**Tech Stack:** React 19, React Router 7, TanStack Query 5, Tailwind CSS 4, shadcn/ui, sonner, date-fns 4

**Spec:** `docs/superpowers/specs/2026-03-17-modernization-design.md`

---

## File Map

All new files in `src/client/`. Phase 1 files are modified only where noted.

| File | Responsibility |
|------|---------------|
| `src/client/main.tsx` | React root mount with QueryClient, Router, Toaster |
| `src/client/router.tsx` | React Router 7 route tree with AuthGuard, Layout |
| `src/client/lib/api.ts` | Fetch wrapper: base URL, JSON, 401 redirect, error class |
| `src/client/lib/config.ts` | Read `window.__ADMIN_CONFIG__` with type safety |
| `src/client/components/AuthGuard.tsx` | Check `GET /api/islogged`, redirect to login on 401 |
| `src/client/components/Layout.tsx` | Navbar with dynamic menu based on services, Outlet |
| `src/client/components/ErrorBoundary.tsx` | Class-based error boundary for React render crashes |
| `src/client/components/RouteErrorPage.tsx` | Route-level error page using `useRouteError()` |
| `src/client/pages/Login.tsx` | Login form with error handling |
| `src/client/pages/NotFound.tsx` | 404 catch-all page |
| `src/client/pages/Placeholder.tsx` | Reusable placeholder for pages not yet implemented |
| `src/client/styles/globals.css` | Tailwind directives |
| `tests/client/setup.ts` | Test setup (DOM environment, cleanup) |
| `tests/client/components/AuthGuard.test.tsx` | AuthGuard redirect tests |
| `tests/client/components/Layout.test.tsx` | Layout navbar rendering tests |
| `tests/client/pages/Login.test.tsx` | Login form tests |

**Config files modified:**
| File | Change |
|------|--------|
| `package.json` | Add new frontend deps |
| `tsconfig.json` | Add Tailwind types |
| `vite.config.ts` | Add Tailwind plugin |
| `vitest.config.ts` | Add jsdom env for client tests |
| `src/client/index.html` | Add CSS import |

---

## Task 1: Install Frontend Dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install production dependencies**

```bash
npm install react-router@7 @tanstack/react-query@5 sonner date-fns@4 \
  @tailwindcss/vite tailwindcss clsx --legacy-peer-deps
```

- [ ] **Step 2: Install dev dependencies**

```bash
npm install -D @testing-library/react @testing-library/jest-dom \
  @testing-library/user-event jsdom --legacy-peer-deps
```

Note: `--legacy-peer-deps` is needed because legacy eslint plugins conflict with new eslint v10.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add Phase 2 frontend dependencies"
```

---

## Task 2: Tailwind CSS Setup

**Files:**
- Modify: `src/client/styles/globals.css`
- Modify: `vite.config.ts`
- Modify: `src/client/index.html`

- [ ] **Step 1: Update globals.css with Tailwind directives**

`src/client/styles/globals.css`:
```css
@import "tailwindcss";

body {
  font-family: system-ui, -apple-system, sans-serif;
  margin: 0;
}
```

- [ ] **Step 2: Add Tailwind Vite plugin**

In `vite.config.ts`, add the import and plugin:

```typescript
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  plugins: [react(), tailwindcss()],
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

- [ ] **Step 3: Add CSS import to index.html**

In `src/client/index.html`, add inside `<head>`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title><!--BRANDING_TITLE--></title>
  <link rel="stylesheet" href="/styles/globals.css" />
</head>
<body>
  <!--ADMIN_CONFIG-->
  <div id="app"></div>
  <script type="module" src="/main.tsx"></script>
</body>
</html>
```

- [ ] **Step 4: Verify Vite builds**

```bash
npx vite build --config vite.config.ts
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/client/styles/globals.css vite.config.ts src/client/index.html
git commit -m "feat: configure Tailwind CSS 4 with Vite plugin"
```

---

## Task 3: Config Reader + API Client

**Files:**
- Create: `src/client/lib/config.ts`
- Create: `src/client/lib/api.ts`

- [ ] **Step 1: Create config reader**

`src/client/lib/config.ts`:
```typescript
export interface AdminConfig {
  brandingTitle: string;
  services: string[];
  currencies: string[];
  chatRoomPrefix: string;
  userMetadataList: string[];
}

declare global {
  interface Window {
    __ADMIN_CONFIG__?: AdminConfig;
  }
}

export function getConfig(): AdminConfig {
  return (
    window.__ADMIN_CONFIG__ ?? {
      brandingTitle: "Ganomede",
      services: [],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    }
  );
}
```

- [ ] **Step 2: Create API client**

`src/client/lib/api.ts`:
```typescript
const API_BASE = "/admin/v1/api";

export class ApiError extends Error {
  public readonly status: number;
  public readonly data: unknown;

  constructor(status: number, data: unknown) {
    super(typeof data === "object" && data && "error" in data ? String((data as Record<string, unknown>).error) : `API error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "same-origin",
  });

  if (res.status === 401) {
    // Don't redirect if we're already on the login page or checking auth
    if (!path.includes("/islogged") && !path.includes("/login")) {
      window.location.href = "/admin/v1/web/login";
    }
    throw new ApiError(401, { error: "Unauthorized" });
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, data);
  }

  // Handle empty responses (204, etc.)
  const text = await res.text();
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  del: <T>(path: string) => request<T>("DELETE", path),
};
```

- [ ] **Step 3: Verify compilation**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/client/lib/config.ts src/client/lib/api.ts
git commit -m "feat: add config reader and API client"
```

---

## Task 4: Test Infrastructure for Client

**Files:**
- Create: `tests/client/setup.ts`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Create test setup**

This file is imported explicitly by each client test file (via `import "../../client/setup.js"`).

`tests/client/setup.ts`:
```typescript
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 2: Update vitest.config.ts for client tests**

Note: Vitest 4.x does not support `environmentMatchGlobs`. Instead, client test files use a `@vitest-environment jsdom` docblock comment at the top. The `setupFiles` is scoped to only run for client tests via the same mechanism.

`vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    root: ".",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    environment: "node",
    passWithNoTests: true,
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

**IMPORTANT:** Every client test file (`tests/client/**/*.test.tsx`) MUST include these two lines at the very top:
```typescript
// @vitest-environment jsdom
import "../../client/setup.js";
```
This tells Vitest to use jsdom for that specific file and runs the client test setup.

- [ ] **Step 3: Verify vitest runs**

```bash
npx vitest run
```

Expected: All existing tests pass (42 server tests), no new failures.

- [ ] **Step 4: Commit**

```bash
git add tests/client/setup.ts vitest.config.ts
git commit -m "feat: configure client test infrastructure with jsdom"
```

---

## Task 5: Error Components

**Files:**
- Create: `src/client/components/ErrorBoundary.tsx`
- Create: `src/client/components/RouteErrorPage.tsx`

- [ ] **Step 1: Implement ErrorBoundary (class component for React render errors)**

`src/client/components/ErrorBoundary.tsx`:
```tsx
import { Component, type ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center p-8">
          <div className="max-w-md text-center">
            <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
            <p className="mt-2 text-gray-600">{this.state.error?.message}</p>
            <button
              className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
              onClick={() => window.location.reload()}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
```

- [ ] **Step 2: Implement RouteErrorPage (for React Router's `errorElement`)**

React Router's `errorElement` does NOT trigger `getDerivedStateFromError` — it renders the element directly. Use `useRouteError()` to access the error.

`src/client/components/RouteErrorPage.tsx`:
```tsx
import { useRouteError, isRouteErrorResponse } from "react-router";

export function RouteErrorPage() {
  const error = useRouteError();

  const message = isRouteErrorResponse(error)
    ? `${error.status}: ${error.statusText}`
    : error instanceof Error
      ? error.message
      : "An unexpected error occurred";

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-bold text-red-600">Something went wrong</h1>
        <p className="mt-2 text-gray-600">{message}</p>
        <button
          className="mt-4 rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          onClick={() => window.location.reload()}
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
```

No dedicated tests for either — best tested via integration.

- [ ] **Step 3: Commit**

```bash
git add src/client/components/ErrorBoundary.tsx src/client/components/RouteErrorPage.tsx
git commit -m "feat: add ErrorBoundary and RouteErrorPage components"
```

---

## Task 6: AuthGuard Component (TDD)

**Files:**
- Create: `src/client/components/AuthGuard.tsx`
- Create: `tests/client/components/AuthGuard.test.tsx`

- [ ] **Step 1: Write AuthGuard tests**

`tests/client/components/AuthGuard.test.tsx`:
```tsx
// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthGuard } from "../../../src/client/components/AuthGuard.js";

// Mock the api module
vi.mock("../../../src/client/lib/api.js", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "../../../src/client/lib/api.js";
const mockGet = vi.mocked(api.get);

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/v1/web/login" element={<div>Login Page</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/admin/v1/web/users" element={<div>Users Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading state while checking auth", () => {
    mockGet.mockReturnValue(new Promise(() => {})); // Never resolves
    renderWithRouter("/admin/v1/web/users");
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it("renders outlet when authenticated", async () => {
    mockGet.mockResolvedValue({ success: true });
    renderWithRouter("/admin/v1/web/users");
    await waitFor(() => {
      expect(screen.getByText("Users Page")).toBeInTheDocument();
    });
  });

  it("redirects to login when not authenticated", async () => {
    mockGet.mockRejectedValue({ status: 401 });
    renderWithRouter("/admin/v1/web/users");
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests — should FAIL**

```bash
npx vitest run tests/client/components/AuthGuard.test.tsx
```

- [ ] **Step 3: Implement AuthGuard**

`src/client/components/AuthGuard.tsx`:
```tsx
import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { api } from "../lib/api.js";

export function AuthGuard() {
  const [state, setState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    api
      .get("/islogged")
      .then(() => setState("authenticated"))
      .catch(() => setState("unauthenticated"));
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return <Navigate to="/admin/v1/web/login" replace />;
  }

  return <Outlet />;
}
```

- [ ] **Step 4: Run tests — should PASS**

```bash
npx vitest run tests/client/components/AuthGuard.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/client/components/AuthGuard.tsx tests/client/components/AuthGuard.test.tsx
git commit -m "feat: add AuthGuard component with tests"
```

---

## Task 7: Layout Component (TDD)

**Files:**
- Create: `src/client/components/Layout.tsx`
- Create: `tests/client/components/Layout.test.tsx`

- [ ] **Step 1: Write Layout tests**

`tests/client/components/Layout.test.tsx`:
```tsx
// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Layout } from "../../../src/client/components/Layout.js";

// Mock config
vi.mock("../../../src/client/lib/config.js", () => ({
  getConfig: vi.fn(),
}));

// Mock api
vi.mock("../../../src/client/lib/api.js", () => ({
  api: { post: vi.fn() },
}));

import { getConfig } from "../../../src/client/lib/config.js";
const mockGetConfig = vi.mocked(getConfig);

describe("Layout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders navbar with branding title", () => {
    mockGetConfig.mockReturnValue({
      brandingTitle: "Triominos",
      services: ["users", "virtualcurrency"],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Triominos Administration")).toBeInTheDocument();
  });

  it("shows nav links for available services", () => {
    mockGetConfig.mockReturnValue({
      brandingTitle: "Test",
      services: ["users", "virtualcurrency", "data", "chat"],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Packs")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("hides Data link when data service is unavailable", () => {
    mockGetConfig.mockReturnValue({
      brandingTitle: "Test",
      services: ["users", "virtualcurrency"],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });

  it("shows logout button", () => {
    mockGetConfig.mockReturnValue({
      brandingTitle: "Test",
      services: [],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests — should FAIL**

```bash
npx vitest run tests/client/components/Layout.test.tsx
```

- [ ] **Step 3: Implement Layout**

`src/client/components/Layout.tsx`:
```tsx
import { NavLink, Outlet, useNavigate } from "react-router";
import { getConfig } from "../lib/config.js";
import { api } from "../lib/api.js";

const BASE = "/admin/v1/web";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded text-sm font-medium ${
    isActive ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
  }`;
}

export function Layout() {
  const config = getConfig();
  const navigate = useNavigate();
  const hasService = (name: string) => config.services.includes(name);

  async function handleLogout() {
    try {
      await api.post("/logout");
    } finally {
      navigate(`${BASE}/login`, { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-1">
              <NavLink to={`${BASE}`} end className="mr-4 text-lg font-bold text-white">
                {config.brandingTitle} Administration
              </NavLink>

              {hasService("virtualcurrency") && (
                <>
                  <NavLink to={`${BASE}/items`} className={navLinkClass}>
                    Items
                  </NavLink>
                  <NavLink to={`${BASE}/packs`} className={navLinkClass}>
                    Packs
                  </NavLink>
                </>
              )}

              {hasService("users") && (
                <NavLink to={`${BASE}/users`} className={navLinkClass}>
                  Users
                </NavLink>
              )}

              {hasService("data") && (
                <NavLink to={`${BASE}/data`} className={navLinkClass}>
                  Data
                </NavLink>
              )}

              {hasService("chat") && (
                <>
                  <NavLink to={`${BASE}/reported`} className={navLinkClass}>
                    Reported Users
                  </NavLink>
                  <NavLink to={`${BASE}/chat`} className={navLinkClass}>
                    Chat
                  </NavLink>
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="rounded px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — should PASS**

```bash
npx vitest run tests/client/components/Layout.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/client/components/Layout.tsx tests/client/components/Layout.test.tsx
git commit -m "feat: add Layout component with dynamic navbar and tests"
```

---

## Task 8: Login Page (TDD)

**Files:**
- Create: `src/client/pages/Login.tsx`
- Create: `tests/client/pages/Login.test.tsx`

- [ ] **Step 1: Write Login tests**

`tests/client/pages/Login.test.tsx`:
```tsx
// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Login } from "../../../src/client/pages/Login.js";

vi.mock("../../../src/client/lib/api.js", () => ({
  api: { post: vi.fn() },
  ApiError: class extends Error {
    status: number;
    constructor(status: number) {
      super("error");
      this.status = status;
    }
  },
}));

vi.mock("../../../src/client/lib/config.js", () => ({
  getConfig: () => ({
    brandingTitle: "TestApp",
    services: [],
    currencies: [],
    chatRoomPrefix: "",
    userMetadataList: [],
  }),
}));

import { api } from "../../../src/client/lib/api.js";
const mockPost = vi.mocked(api.post);

describe("Login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders login form with branding", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText(/login to testapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("submits credentials and navigates on success", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/login", {
        username: "admin",
        password: "secret",
      });
    });
  });

  it("shows error on failed login", async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue(new Error("Invalid username or password."));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
  });
});
```

- [ ] **Step 2: Run tests — should FAIL**

```bash
npx vitest run tests/client/pages/Login.test.tsx
```

- [ ] **Step 3: Implement Login page**

`src/client/pages/Login.tsx`:
```tsx
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router";
import { api } from "../lib/api.js";
import { getConfig } from "../lib/config.js";

export function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const config = getConfig();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await api.post("/login", { username, password });
      navigate("/admin/v1/web/users", { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm">
        <h2 className="mb-6 text-center text-2xl font-bold text-gray-900">
          Login to {config.brandingTitle}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Username"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Password"
            />
          </div>

          {error && (
            <div className="rounded bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests — should PASS**

```bash
npx vitest run tests/client/pages/Login.test.tsx
```

- [ ] **Step 5: Commit**

```bash
git add src/client/pages/Login.tsx tests/client/pages/Login.test.tsx
git commit -m "feat: add Login page with tests"
```

---

## Task 9: NotFound + Placeholder Pages

**Files:**
- Create: `src/client/pages/NotFound.tsx`
- Create: `src/client/pages/Placeholder.tsx`

- [ ] **Step 1: Create NotFound page**

`src/client/pages/NotFound.tsx`:
```tsx
import { Link } from "react-router";

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900">404</h1>
        <p className="mt-2 text-gray-600">Page not found</p>
        <Link
          to="/admin/v1/web/users"
          className="mt-4 inline-block rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Go Home
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create Placeholder component**

`src/client/pages/Placeholder.tsx`:
```tsx
interface PlaceholderProps {
  title: string;
}

export function Placeholder({ title }: PlaceholderProps) {
  return (
    <div className="rounded border border-dashed border-gray-300 p-8 text-center">
      <h2 className="text-xl font-semibold text-gray-700">{title}</h2>
      <p className="mt-2 text-gray-500">This page will be implemented in a future phase.</p>
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/pages/NotFound.tsx src/client/pages/Placeholder.tsx
git commit -m "feat: add NotFound and Placeholder page components"
```

---

## Task 10: Router + App Assembly

**Files:**
- Create: `src/client/router.tsx`
- Modify: `src/client/main.tsx`

- [ ] **Step 1: Create router**

`src/client/router.tsx`:
```tsx
import { createBrowserRouter, Navigate } from "react-router";
import { RouteErrorPage } from "./components/RouteErrorPage.js";
import { AuthGuard } from "./components/AuthGuard.js";
import { Layout } from "./components/Layout.js";
import { Login } from "./pages/Login.js";
import { NotFound } from "./pages/NotFound.js";
import { Placeholder } from "./pages/Placeholder.js";

const BASE = "/admin/v1/web";

export const router = createBrowserRouter([
  {
    path: BASE,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "login", element: <Login /> },
      {
        element: <AuthGuard />,
        children: [
          {
            element: <Layout />,
            children: [
              { index: true, element: <Navigate to="users" replace /> },
              { path: "users", element: <Placeholder title="Users" /> },
              { path: "users/:username", element: <Placeholder title="User Profile" /> },
              { path: "items", element: <Placeholder title="Items" /> },
              { path: "packs", element: <Placeholder title="Packs" /> },
              { path: "data", element: <Placeholder title="Data" /> },
              { path: "data/:docId", element: <Placeholder title="Data Document" /> },
              { path: "reported", element: <Placeholder title="Reported Users" /> },
              { path: "chat", element: <Placeholder title="Chat" /> },
              { path: "chat/:username1,:username2", element: <Placeholder title="Chat Room" /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
```

- [ ] **Step 2: Update main.tsx**

`src/client/main.tsx`:
```tsx
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "sonner";
import { router } from "./router.js";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("app")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
      <Toaster position="top-right" richColors />
    </QueryClientProvider>
  </StrictMode>,
);
```

- [ ] **Step 3: Verify compilation and build**

```bash
npx tsc --noEmit
npx vite build --config vite.config.ts
```

Expected: Both succeed.

- [ ] **Step 4: Commit**

```bash
git add src/client/router.tsx src/client/main.tsx
git commit -m "feat: assemble frontend with Router, QueryClient, and Toaster"
```

---

## Task 11: Full Test Suite Verification

**Files:**
- No new files

- [ ] **Step 1: Run all tests**

```bash
npx vitest run
```

Expected: All tests pass — server tests (42) + client tests (AuthGuard 3, Layout 4, Login 3 = 10).

- [ ] **Step 2: Run type checker**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Verify Vite build**

```bash
npx vite build --config vite.config.ts
```

Expected: Build succeeds.

- [ ] **Step 4: Start server and verify frontend loads**

```bash
# Build first so dist/client/index.html exists
npx vite build --config vite.config.ts

# Start server
ADMIN_USERNAME=admin ADMIN_PASSWORD=admin API_SECRET=test CURRENCY_CODES=gold \
  UPSTREAM_URL=http://localhost:9999 \
  timeout 5 npx tsx src/server/index.ts 2>&1 || true
```

Expected: Server starts. `GET http://localhost:8000/admin/v1/web/login` returns HTML with `__ADMIN_CONFIG__` injected.

- [ ] **Step 5: Fix any issues and commit if needed**

```bash
# Only if fixes were made:
git add -A && git commit -m "fix: address Phase 2 integration issues"
```

---

## Summary

After completing all 11 tasks, Phase 2 delivers:

| Component | Status |
|-----------|--------|
| Tailwind CSS 4 | Configured with Vite plugin |
| React Router 7 | Full route tree with auth protection |
| TanStack Query 5 | QueryClient configured (30s staleTime) |
| API client | Fetch wrapper with 401 redirect |
| Config reader | Type-safe `window.__ADMIN_CONFIG__` reader |
| AuthGuard | Check `/api/islogged`, redirect to login | Tested |
| Layout | Navbar with dynamic menu based on services | Tested |
| ErrorBoundary | Top-level render error catch |
| Login page | Form with error handling | Tested |
| Placeholder pages | Stub for all routes (Users, Items, Packs, Data, Chat, Reports) |
| NotFound page | 404 catch-all |
| sonner | Toast provider configured |
| Client test infra | jsdom env, setup file, Testing Library |

**Note:** shadcn/ui CLI initialization (`npx shadcn@latest init`) is deferred to Phase 3 — it creates `components.json` which is only needed when adding actual UI components. Phase 3 must run `npx shadcn@latest init` before `npx shadcn add button` etc.

**Next:** Phase 3 — Core Pages: Users (search, profile, actions, transactions)
