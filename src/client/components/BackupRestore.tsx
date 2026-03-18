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
