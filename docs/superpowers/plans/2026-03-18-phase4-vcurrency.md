# Phase 4: Virtual Currency Pages — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Items and Packs pages with CRUD, inline cost editing, backup and restore with progress.

**Architecture:** Backend routes proxy to virtualcurrency service. Frontend uses TanStack Query for data, with inline editing via controlled React forms. Backup downloads JSON, restore uploads and batch-processes in parallel (5 at a time) with progress tracking.

**Tech Stack:** Express 5, React 19, TanStack Query 5, Tailwind CSS 4, sonner

**Spec:** `docs/superpowers/specs/2026-03-17-modernization-design.md` — Phase 4

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/server/routes/vcurrency.ts` | Items and packs proxy routes (GET list, POST create, PUT update) |
| `src/client/lib/queries/vcurrency.ts` | TanStack Query hooks for items and packs |
| `src/client/components/BackupRestore.tsx` | Shared backup/restore component with progress bar |
| `src/client/pages/Items.tsx` | Items list with CostsTable inline editor, add new item, backup/restore |
| `src/client/pages/Packs.tsx` | Packs list with inline editing, backup/restore |
| `tests/server/routes/vcurrency.test.ts` | Backend route tests |

---

## Task 1: Backend Virtual Currency Routes

**Files:**
- Create: `src/server/routes/vcurrency.ts`
- Modify: `src/server/app.ts`

- [ ] **Step 1: Implement vcurrency routes**

`src/server/routes/vcurrency.ts`:
```typescript
import { Router, type Request, type Response } from "express";
import type { Config } from "../config.js";
import { proxyToUpstream } from "../proxy.js";

interface VCurrencyRouterDeps {
  config: Config;
}

export function createVCurrencyRouter({ config }: VCurrencyRouterDeps): Router {
  const router = Router();

  function upstreamUrl(): string {
    if (!config.UPSTREAM_URL) throw new Error("UPSTREAM_URL is required");
    return config.UPSTREAM_URL;
  }

  // --- Items ---
  router.get("/items", async (_req: Request, res: Response) => {
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}/products?limit=500`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    // Wrap in {items, currencies} format
    const items = Array.isArray(result.data) ? result.data : [];
    res.json({ items, currencies: config.CURRENCY_CODES });
  });

  router.post("/items/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(base, `/virtualcurrency/v1/products`, {
      method: "POST",
      body,
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  router.put("/items/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(base, `/virtualcurrency/v1/products`, {
      method: "PUT",
      body,
      timeoutMs: config.UPSTREAM_TIMEOUT_MS,
    });
    res.status(result.status).json(result.data);
  });

  // --- Packs ---
  router.get("/packs", async (_req: Request, res: Response) => {
    const base = upstreamUrl();
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}/packs?limit=500`,
      { method: "GET", timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.json(result.data);
  });

  router.post("/packs/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}/packs`,
      { method: "POST", body, timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.status(result.status).json(result.data);
  });

  router.put("/packs/:id", async (req: Request, res: Response) => {
    const base = upstreamUrl();
    const body = { ...req.body, secret: config.API_SECRET };
    const result = await proxyToUpstream(
      base,
      `/virtualcurrency/v1/auth/${config.API_SECRET}/packs`,
      { method: "PUT", body, timeoutMs: config.UPSTREAM_TIMEOUT_MS },
    );
    res.status(result.status).json(result.data);
  });

  return router;
}
```

- [ ] **Step 2: Mount in app.ts**

Add after users router:
```typescript
import { createVCurrencyRouter } from "./routes/vcurrency.js";
// ...
app.use(apiRoot, createVCurrencyRouter({ config }));
```

- [ ] **Step 3: Commit**

```bash
git add src/server/routes/vcurrency.ts src/server/app.ts
git commit -m "feat: add virtual currency routes (items + packs CRUD)"
```

---

## Task 2: Backend Tests

**Files:**
- Create: `tests/server/routes/vcurrency.test.ts`

- [ ] **Step 1: Write tests**

`tests/server/routes/vcurrency.test.ts`:
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
});
const pkg = { name: "admin", version: "2.0.0", description: "Test", api: "admin/v1" };

const mswServer = setupServer();
beforeAll(() => mswServer.listen({ onUnhandledRequest: "bypass" }));
afterEach(() => mswServer.resetHandlers());
afterAll(() => mswServer.close());

function createTestApp() { return createApp({ config, pkg }); }

async function loginAndGetCookie(app: ReturnType<typeof createTestApp>) {
  const loginRes = await request(app)
    .post("/admin/v1/api/login")
    .send({ username: "admin", password: "secret" });
  return loginRes.headers["set-cookie"][0];
}

describe("vcurrency routes", () => {
  it("GET /items returns items with currencies", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret/products`, () =>
        HttpResponse.json([{ id: "sword", costs: { gold: 100 } }]),
      ),
    );
    const app = createTestApp();
    const cookie = await loginAndGetCookie(app);
    const res = await request(app).get("/admin/v1/api/items").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.currencies).toEqual(["gold", "silver"]);
  });

  it("POST /items/:id creates item with secret", async () => {
    mswServer.use(
      http.post(`${UPSTREAM}/virtualcurrency/v1/products`, async ({ request }) => {
        const body = await request.json() as Record<string, unknown>;
        expect(body.secret).toBe("test-secret");
        return HttpResponse.json({ ok: true });
      }),
    );
    const app = createTestApp();
    const cookie = await loginAndGetCookie(app);
    const res = await request(app)
      .post("/admin/v1/api/items/sword")
      .set("Cookie", cookie)
      .send({ id: "sword", costs: { gold: 100 } });
    expect(res.status).toBe(200);
  });

  it("GET /packs returns packs array", async () => {
    mswServer.use(
      http.get(`${UPSTREAM}/virtualcurrency/v1/auth/test-secret/packs`, () =>
        HttpResponse.json([{ id: "pack1", currency: "gold", amount: 500 }]),
      ),
    );
    const app = createTestApp();
    const cookie = await loginAndGetCookie(app);
    const res = await request(app).get("/admin/v1/api/packs").set("Cookie", cookie);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests**

```bash
npx vitest run tests/server/routes/vcurrency.test.ts
```

- [ ] **Step 3: Commit**

```bash
git add tests/server/routes/vcurrency.test.ts
git commit -m "test: add virtual currency route tests"
```

---

## Task 3: Frontend Query Hooks + BackupRestore Component

**Files:**
- Create: `src/client/lib/queries/vcurrency.ts`
- Create: `src/client/components/BackupRestore.tsx`

- [ ] **Step 1: Implement vcurrency query hooks**

`src/client/lib/queries/vcurrency.ts`:
```typescript
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api.js";

export interface Item {
  id: string;
  costs: Record<string, number>;
}

export interface ItemsResponse {
  items: Item[];
  currencies: string[];
}

export interface Pack {
  id: string;
  currency: string;
  amount: number;
}

export const vcurrencyKeys = {
  items: () => ["items"] as const,
  packs: () => ["packs"] as const,
};

export function useItems() {
  return useQuery({
    queryKey: vcurrencyKeys.items(),
    queryFn: () => api.get<ItemsResponse>("/items"),
  });
}

export function usePacks() {
  return useQuery({
    queryKey: vcurrencyKeys.packs(),
    queryFn: () => api.get<Pack[]>("/packs"),
  });
}

export function useSaveItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (item: Item) => {
      // Try POST first (create), fall back to PUT (update)
      try {
        return await api.post(`/items/${encodeURIComponent(item.id)}`, item);
      } catch {
        return await api.put(`/items/${encodeURIComponent(item.id)}`, item);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: vcurrencyKeys.items() }),
  });
}

export function useSavePack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pack: Pack) => {
      try {
        return await api.post(`/packs/${encodeURIComponent(pack.id)}`, pack);
      } catch {
        return await api.put(`/packs/${encodeURIComponent(pack.id)}`, pack);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: vcurrencyKeys.packs() }),
  });
}
```

- [ ] **Step 2: Implement BackupRestore component**

`src/client/components/BackupRestore.tsx`:
```tsx
import { useState, useRef } from "react";
import { toast } from "sonner";

interface BackupRestoreProps<T> {
  filename: string;
  getData: () => T[];
  validateItem: (item: unknown) => item is T;
  saveOne: (item: T) => Promise<unknown>;
  onComplete: () => void;
  itemLabel?: string;
}

export function BackupRestore<T>({
  filename,
  getData,
  validateItem,
  saveOne,
  onComplete,
  itemLabel = "items",
}: BackupRestoreProps<T>) {
  const [restoreData, setRestoreData] = useState<T[] | null>(null);
  const [progress, setProgress] = useState<{ completed: number; total: number; failed: number } | null>(null);
  const [restoring, setRestoring] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleBackup() {
    const data = getData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Backed up ${data.length} ${itemLabel}`);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!Array.isArray(parsed)) {
          toast.error("Invalid file: expected a JSON array");
          return;
        }
        const valid = parsed.every(validateItem);
        if (!valid) {
          toast.error("Invalid file: some entries have invalid structure");
          return;
        }
        setRestoreData(parsed as T[]);
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  async function handleRestore() {
    if (!restoreData) return;
    setRestoring(true);
    setProgress({ completed: 0, total: restoreData.length, failed: 0 });

    let completed = 0;
    let failed = 0;
    const batchSize = 5;

    for (let i = 0; i < restoreData.length; i += batchSize) {
      const batch = restoreData.slice(i, i + batchSize);
      const results = await Promise.allSettled(batch.map(saveOne));
      for (const r of results) {
        completed++;
        if (r.status === "rejected") failed++;
        setProgress({ completed, total: restoreData.length, failed });
      }
    }

    setRestoring(false);
    setRestoreData(null);
    setProgress(null);
    if (fileRef.current) fileRef.current.value = "";

    if (failed > 0) {
      toast.warning(`${failed} of ${completed} ${itemLabel} failed to restore`);
    } else {
      toast.success(`All ${completed} ${itemLabel} restored successfully`);
    }
    onComplete();
  }

  return (
    <div className="flex items-center gap-2">
      <button onClick={handleBackup} className="rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
        Backup
      </button>

      <input ref={fileRef} type="file" accept=".json" onChange={handleFileSelect} className="text-sm" />

      {restoreData && !restoring && (
        <button
          onClick={handleRestore}
          className="rounded bg-orange-600 px-3 py-1.5 text-sm text-white hover:bg-orange-700"
        >
          Restore {restoreData.length} {itemLabel}
        </button>
      )}

      {progress && (
        <div className="flex items-center gap-2">
          <div className="h-2 w-32 rounded bg-gray-200">
            <div
              className="h-2 rounded bg-blue-600 transition-all"
              style={{ width: `${(progress.completed / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">
            {progress.completed}/{progress.total}
            {progress.failed > 0 && ` (${progress.failed} failed)`}
          </span>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/client/lib/queries/vcurrency.ts src/client/components/BackupRestore.tsx
git commit -m "feat: add vcurrency query hooks and BackupRestore component"
```

---

## Task 4: Items Page

**Files:**
- Create: `src/client/pages/Items.tsx`
- Modify: `src/client/router.tsx`

- [ ] **Step 1: Implement Items page**

`src/client/pages/Items.tsx`:
```tsx
import { useState } from "react";
import { toast } from "sonner";
import { useItems, useSaveItem, type Item } from "../lib/queries/vcurrency.js";
import { BackupRestore } from "../components/BackupRestore.js";
import { stripPrefix } from "../lib/utils.js";
import { api } from "../lib/api.js";

export function Items() {
  const { data, isLoading, error, refetch } = useItems();
  const saveItem = useSaveItem();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCosts, setEditCosts] = useState<Record<string, number>>({});
  const [newItemId, setNewItemId] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  if (isLoading) return <p className="text-gray-500">Loading items...</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;

  const items = data?.items ?? [];
  const currencies = data?.currencies ?? [];

  function startEdit(item: Item) {
    setEditingId(item.id);
    setEditCosts({ ...item.costs });
  }

  function handleSave(item: Item) {
    saveItem.mutate(
      { id: item.id, costs: editCosts },
      {
        onSuccess: () => {
          toast.success(`Saved ${item.id}`);
          setEditingId(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function handleAddItem() {
    if (!newItemId.trim()) return;
    const newItem: Item = { id: newItemId.trim(), costs: {} };
    saveItem.mutate(newItem, {
      onSuccess: () => {
        toast.success(`Created ${newItemId}`);
        setNewItemId("");
        setShowAddForm(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  function validateItem(item: unknown): item is Item {
    return typeof item === "object" && item !== null && "id" in item && "costs" in item;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Items</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="rounded bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
          >
            Add New Item
          </button>
          <BackupRestore
            filename="items"
            getData={() => items}
            validateItem={validateItem}
            saveOne={(item) =>
              api.post(`/items/${encodeURIComponent(item.id)}`, item).catch(() =>
                api.put(`/items/${encodeURIComponent(item.id)}`, item),
              )
            }
            onComplete={() => refetch()}
            itemLabel="items"
          />
        </div>
      </div>

      {showAddForm && (
        <div className="mb-4 flex gap-2 rounded border border-green-200 bg-green-50 p-3">
          <input
            type="text"
            value={newItemId}
            onChange={(e) => setNewItemId(e.target.value)}
            placeholder="Item ID"
            className="flex-1 rounded border px-3 py-1.5 text-sm"
          />
          <button onClick={handleAddItem} className="rounded bg-green-600 px-3 py-1.5 text-sm text-white">
            Create
          </button>
          <button onClick={() => setShowAddForm(false)} className="text-sm text-gray-500">
            Cancel
          </button>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2">Item ID</th>
            {currencies.map((c) => (
              <th key={c} className="pb-2 text-right">
                {stripPrefix(c)}
              </th>
            ))}
            <th className="pb-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b hover:bg-gray-50">
              <td className="py-2 font-medium">{stripPrefix(item.id)}</td>
              {currencies.map((c) => (
                <td key={c} className="py-2 text-right">
                  {editingId === item.id ? (
                    <input
                      type="number"
                      value={editCosts[c] ?? ""}
                      onChange={(e) =>
                        setEditCosts({
                          ...editCosts,
                          [c]: e.target.value ? parseInt(e.target.value) : 0,
                        })
                      }
                      className="w-20 rounded border px-2 py-1 text-right text-sm"
                    />
                  ) : (
                    item.costs[c] ?? "-"
                  )}
                </td>
              ))}
              <td className="py-2 text-right">
                {editingId === item.id ? (
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleSave(item)}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(item)} className="text-xs text-blue-600 hover:underline">
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.length === 0 && <p className="mt-4 text-gray-500">No items</p>}
    </div>
  );
}
```

- [ ] **Step 2: Update router**

Import and replace placeholder in `src/client/router.tsx`:
```tsx
import { Items } from "./pages/Items.js";
```

- [ ] **Step 3: Commit**

```bash
git add src/client/pages/Items.tsx src/client/router.tsx
git commit -m "feat: add Items page with inline cost editing and backup/restore"
```

---

## Task 5: Packs Page

**Files:**
- Create: `src/client/pages/Packs.tsx`
- Modify: `src/client/router.tsx`

- [ ] **Step 1: Implement Packs page**

`src/client/pages/Packs.tsx`:
```tsx
import { useState } from "react";
import { toast } from "sonner";
import { usePacks, useSavePack, type Pack } from "../lib/queries/vcurrency.js";
import { BackupRestore } from "../components/BackupRestore.js";
import { stripPrefix } from "../lib/utils.js";
import { api } from "../lib/api.js";

export function Packs() {
  const { data: packs, isLoading, error, refetch } = usePacks();
  const savePack = useSavePack();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState(0);

  if (isLoading) return <p className="text-gray-500">Loading packs...</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;

  const list = packs ?? [];

  function startEdit(pack: Pack) {
    setEditingId(pack.id);
    setEditAmount(pack.amount);
  }

  function handleSave(pack: Pack) {
    savePack.mutate(
      { id: pack.id, currency: pack.currency, amount: editAmount },
      {
        onSuccess: () => {
          toast.success(`Saved ${pack.id}`);
          setEditingId(null);
        },
        onError: (err) => toast.error(err.message),
      },
    );
  }

  function validatePack(item: unknown): item is Pack {
    return (
      typeof item === "object" &&
      item !== null &&
      "id" in item &&
      "currency" in item &&
      "amount" in item
    );
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Packs</h1>
        <BackupRestore
          filename="packs"
          getData={() => list}
          validateItem={validatePack}
          saveOne={(pack) =>
            api.post(`/packs/${encodeURIComponent(pack.id)}`, pack).catch(() =>
              api.put(`/packs/${encodeURIComponent(pack.id)}`, pack),
            )
          }
          onComplete={() => refetch()}
          itemLabel="packs"
        />
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-gray-500">
            <th className="pb-2">Pack ID</th>
            <th className="pb-2">Currency</th>
            <th className="pb-2 text-right">Amount</th>
            <th className="pb-2 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {list.map((pack) => (
            <tr key={pack.id} className="border-b hover:bg-gray-50">
              <td className="py-2 font-medium">{stripPrefix(pack.id)}</td>
              <td className="py-2">{stripPrefix(pack.currency)}</td>
              <td className="py-2 text-right">
                {editingId === pack.id ? (
                  <input
                    type="number"
                    value={editAmount}
                    onChange={(e) => setEditAmount(parseInt(e.target.value) || 0)}
                    className="w-24 rounded border px-2 py-1 text-right text-sm"
                  />
                ) : (
                  pack.amount
                )}
              </td>
              <td className="py-2 text-right">
                {editingId === pack.id ? (
                  <div className="flex justify-end gap-1">
                    <button
                      onClick={() => handleSave(pack)}
                      className="rounded bg-blue-600 px-2 py-1 text-xs text-white"
                    >
                      Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500">
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button onClick={() => startEdit(pack)} className="text-xs text-blue-600 hover:underline">
                    Edit
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {list.length === 0 && <p className="mt-4 text-gray-500">No packs</p>}
    </div>
  );
}
```

- [ ] **Step 2: Update router**

Import and replace placeholder:
```tsx
import { Packs } from "./pages/Packs.js";
```

- [ ] **Step 3: Verify and commit**

```bash
npx tsc --noEmit
npx vitest run
npx vite build --config vite.config.ts
git add src/client/pages/Packs.tsx src/client/router.tsx
git commit -m "feat: add Packs page with inline editing and backup/restore"
```

---

## Summary

| Component | Status |
|-----------|--------|
| Backend items/packs proxy routes | Implemented + tested |
| TanStack Query hooks for items/packs | Implemented |
| BackupRestore component (shared) | Implemented |
| Items page with inline cost editing | Implemented |
| Items add new item | Implemented |
| Items backup/restore with progress | Implemented |
| Packs page with inline editing | Implemented |
| Packs backup/restore with progress | Implemented |

**Next:** Phase 5 — Data, Chat, Reports Pages (CodeMirror JSON editor, CSV import)
