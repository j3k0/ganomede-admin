import { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { toast } from "sonner";
import { useDataDocs, useDataDoc, useCreateDoc, useUpdateDoc, useDeleteDoc, useBulkUpsert } from "../lib/queries/data.js";
import { JsonEditor, type JsonEditorRef } from "../components/JsonEditor.js";
import { parseCSV } from "../lib/csv-parser.js";
import { api } from "../lib/api.js";

export function Data() {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();

  if (docId) {
    return <DocEditor docId={docId} onBack={() => navigate("/admin/v1/web/data")} />;
  }

  return <DocList />;
}

// --- Document List ---
function DocList() {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"create" | "csv" | "restore">("create");
  const { data: docs, isLoading, refetch } = useDataDocs(query || undefined);
  const navigate = useNavigate();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setQuery(search);
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Data Documents</h1>

      {/* Search */}
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search documents..."
          className="flex-1 rounded border border-gray-300 px-3 py-2"
        />
        <button type="submit" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Search
        </button>
      </form>

      {/* Document list */}
      {isLoading && <p className="text-gray-500">Loading...</p>}
      {docs && (
        <div className="mb-6">
          <p className="mb-2 text-sm text-gray-500">{docs.length} documents</p>
          <div className="max-h-64 overflow-y-auto rounded border">
            {docs.map((id) => (
              <button
                key={id}
                onClick={() => navigate(`/admin/v1/web/data/${encodeURIComponent(id)}`)}
                className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-gray-50"
              >
                {id}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabs: Create / CSV Import / Restore */}
      <div className="mb-4 flex gap-1 border-b">
        {(["create", "csv", "restore"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium ${
              tab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t === "create" ? "Create" : t === "csv" ? "CSV Import" : "Restore"}
          </button>
        ))}
      </div>

      {tab === "create" && <CreateDoc onCreated={() => refetch()} />}
      {tab === "csv" && <CSVImport onImported={() => refetch()} />}
      {tab === "restore" && <RestoreBackup onRestored={() => refetch()} existingDocs={docs ?? []} />}

      {/* Backup */}
      <div className="mt-4">
        <BackupButton docs={docs ?? []} />
      </div>
    </div>
  );
}

// --- Create Document ---
function CreateDoc({ onCreated }: { onCreated: () => void }) {
  const [docId, setDocId] = useState("");
  const editorRef = useRef<JsonEditorRef>(null);
  const create = useCreateDoc();

  function handleCreate() {
    const jsonStr = editorRef.current?.getValue() ?? "{}";
    try {
      const content = JSON.parse(jsonStr);
      const body = docId.trim() ? { id: docId.trim(), ...content } : content;
      create.mutate(body, {
        onSuccess: () => {
          toast.success("Document created");
          setDocId("");
          editorRef.current?.setValue("{}");
          onCreated();
        },
        onError: (err) => toast.error(err.message),
      });
    } catch {
      toast.error("Invalid JSON");
    }
  }

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={docId}
        onChange={(e) => setDocId(e.target.value)}
        placeholder="Document ID (optional)"
        className="w-full rounded border px-3 py-2 text-sm"
      />
      <JsonEditor ref={editorRef} initialValue="{}" height="200px" />
      <button
        onClick={handleCreate}
        disabled={create.isPending}
        className="rounded bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
      >
        {create.isPending ? "Creating..." : "Create Document"}
      </button>
    </div>
  );
}

// --- CSV Import ---
function CSVImport({ onImported }: { onImported: () => void }) {
  const [result, setResult] = useState<ReturnType<typeof parseCSV> | null>(null);
  const bulkUpsert = useBulkUpsert();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const csv = ev.target?.result as string;
      setResult(parseCSV(csv));
    };
    reader.readAsText(file);
  }

  function handleImport() {
    if (!result) return;
    bulkUpsert.mutate(result.documents, {
      onSuccess: () => {
        toast.success(`Imported ${Object.keys(result.documents).length} documents`);
        setResult(null);
        onImported();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-3">
      <input type="file" accept=".csv" onChange={handleFile} className="text-sm" />

      {result && result.errors.length > 0 && (
        <div className="rounded bg-red-50 p-3 text-sm text-red-700">
          {result.errors.map((e, i) => <p key={i}>{e}</p>)}
        </div>
      )}

      {result && result.errors.length === 0 && (
        <div>
          {result.warnings.ignoredColumns.length > 0 && (
            <p className="text-sm text-yellow-600">
              Ignored columns: {result.warnings.ignoredColumns.join(", ")}
            </p>
          )}
          {result.warnings.mergedColumns.length > 0 && (
            <p className="text-sm text-yellow-600">
              Merged columns: {result.warnings.mergedColumns.join(", ")}
            </p>
          )}
          {result.warnings.removedDuplicates.length > 0 && (
            <p className="text-sm text-yellow-600">
              Removed duplicates: {result.warnings.removedDuplicates.join(", ")}
            </p>
          )}

          <p className="mt-2 text-sm text-gray-600">
            {Object.keys(result.documents).length} documents ready to import
          </p>

          <button
            onClick={handleImport}
            disabled={bulkUpsert.isPending}
            className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {bulkUpsert.isPending ? "Importing..." : "Import"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Restore Backup ---
function RestoreBackup({ onRestored, existingDocs }: { onRestored: () => void; existingDocs: string[] }) {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [skipExisting, setSkipExisting] = useState(true);
  const bulkUpsert = useBulkUpsert();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        setData(JSON.parse(ev.target?.result as string));
      } catch {
        toast.error("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }

  function handleRestore() {
    if (!data) return;
    let docs = data;
    if (skipExisting) {
      const filtered: Record<string, unknown> = {};
      for (const [id, content] of Object.entries(data)) {
        if (!existingDocs.includes(id)) filtered[id] = content;
      }
      docs = filtered;
    }
    bulkUpsert.mutate(docs, {
      onSuccess: () => {
        toast.success(`Restored ${Object.keys(docs).length} documents`);
        setData(null);
        onRestored();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-3">
      <input type="file" accept=".json" onChange={handleFile} className="text-sm" />
      {data && (
        <div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={skipExisting}
              onChange={(e) => setSkipExisting(e.target.checked)}
            />
            Skip existing documents
          </label>
          <p className="mt-1 text-sm text-gray-600">{Object.keys(data).length} documents in backup</p>
          <button
            onClick={handleRestore}
            disabled={bulkUpsert.isPending}
            className="mt-2 rounded bg-orange-600 px-4 py-2 text-sm text-white hover:bg-orange-700"
          >
            {bulkUpsert.isPending ? "Restoring..." : "Restore"}
          </button>
        </div>
      )}
    </div>
  );
}

// --- Backup ---
function BackupButton({ docs }: { docs: string[] }) {
  const [backing, setBacking] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  async function handleBackup() {
    setBacking(true);
    const result: Record<string, unknown> = {};
    const batchSize = 5;
    setProgress({ done: 0, total: docs.length });

    for (let i = 0; i < docs.length; i += batchSize) {
      const batch = docs.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        batch.map((id) => api.get<unknown>(`/data/docs/${encodeURIComponent(id)}`)),
      );
      results.forEach((r, j) => {
        if (r.status === "fulfilled") result[batch[j]] = r.value;
      });
      setProgress({ done: Math.min(i + batchSize, docs.length), total: docs.length });
    }

    const blob = new Blob([JSON.stringify(result, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `data-backup-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    setBacking(false);
    setProgress(null);
    toast.success(`Backed up ${Object.keys(result).length} documents`);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleBackup}
        disabled={backing || docs.length === 0}
        className="rounded bg-gray-600 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {backing ? "Backing up..." : "Backup All"}
      </button>
      {progress && (
        <span className="text-xs text-gray-500">
          {progress.done}/{progress.total}
        </span>
      )}
    </div>
  );
}

// --- Document Editor ---
function DocEditor({ docId, onBack }: { docId: string; onBack: () => void }) {
  const { data, isLoading, error } = useDataDoc(docId);
  const update = useUpdateDoc(docId);
  const del = useDeleteDoc();
  const editorRef = useRef<JsonEditorRef>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) return <p className="text-gray-500">Loading document...</p>;
  if (error) return <p className="text-red-600">{error.message}</p>;

  function handleSave() {
    const jsonStr = editorRef.current?.getValue() ?? "{}";
    try {
      const content = JSON.parse(jsonStr);
      update.mutate(content, {
        onSuccess: () => toast.success("Document saved"),
        onError: (err) => toast.error(err.message),
      });
    } catch {
      toast.error("Invalid JSON");
    }
  }

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    del.mutate(docId, {
      onSuccess: () => {
        toast.success("Document deleted");
        onBack();
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={onBack} className="text-sm text-blue-600 hover:underline">
            &larr; Back to list
          </button>
          <h2 className="mt-1 text-xl font-bold">{docId}</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={update.isPending}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
          >
            {update.isPending ? "Saving..." : "Save"}
          </button>
          <button
            onClick={handleDelete}
            className="rounded bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
          >
            {confirmDelete ? "Confirm Delete?" : "Delete"}
          </button>
          {confirmDelete && (
            <button onClick={() => setConfirmDelete(false)} className="text-sm text-gray-500">
              Cancel
            </button>
          )}
        </div>
      </div>

      <JsonEditor
        ref={editorRef}
        initialValue={JSON.stringify(data, null, 2)}
        height="500px"
      />
    </div>
  );
}
