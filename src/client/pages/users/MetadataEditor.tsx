import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useUserMetadata, useUpdateMetadata } from "../../lib/queries/users.js";
import { formatDate, formatDateRelative } from "../../lib/utils.js";

// Fields whose display values are extracted into the profile header
const HEADER_FIELDS = new Set(["auth", "location", "locale", "country"]);

// Known metadata types for smart rendering
type FieldType = "friends" | "date" | "banned" | "boolean" | "json" | "text";

function detectFieldType(id: string, value: string): FieldType {
  if (id === "$friends") return "friends";
  if (id === "auth") return "date";
  if (id === "$banned") return "banned";
  if (id === "$chatdisabled" || id === "$muted") return "boolean";
  if (value.startsWith("{") || value.startsWith("[")) return "json";
  return "text";
}

interface MetadataEditorProps {
  userId: string;
  /** Hide fields that are shown in the profile header */
  hideHeaderFields?: boolean;
}

export function MetadataEditor({ userId, hideHeaderFields = true }: MetadataEditorProps) {
  const { data, isLoading } = useUserMetadata(userId);
  const update = useUpdateMetadata(userId);

  if (isLoading) return <p className="text-sm text-gray-500">Loading metadata...</p>;
  if (!data || data.length === 0) return <p className="text-sm text-gray-500">No metadata fields configured</p>;

  const fields = hideHeaderFields ? data.filter((f) => !HEADER_FIELDS.has(f.id)) : data;

  return (
    <div className="space-y-1.5">
      {fields.map((field) => {
        const strValue = typeof field.value === "object" ? JSON.stringify(field.value) : String(field.value ?? "");
        return (
          <MetadataField
            key={field.id}
            fieldId={field.id}
            initialValue={strValue}
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
        );
      })}
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

  if (editing) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="w-28 shrink-0 truncate font-medium text-gray-500" title={fieldId}>
          {fieldId}
        </span>
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="min-w-0 flex-1 rounded border px-2 py-1 text-xs font-mono"
        />
        <button
          onClick={() => { onSave(value); setEditing(false); }}
          className="shrink-0 rounded bg-green-600 px-2 py-0.5 text-xs text-white"
        >
          Save
        </button>
        <button
          onClick={() => { setValue(initialValue); setEditing(false); }}
          className="shrink-0 text-xs text-gray-500 hover:underline"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-2 text-sm cursor-pointer hover:bg-gray-50 rounded px-1 -mx-1"
      onClick={() => setEditing(true)}
      title="Click to edit"
    >
      <span className="w-28 shrink-0 truncate text-xs font-medium text-gray-500" title={fieldId}>
        {fieldId}
      </span>
      <span className="min-w-0 flex-1 truncate">
        <SmartValue fieldId={fieldId} value={initialValue} />
      </span>
      <span className="shrink-0 text-xs text-gray-400 opacity-0 group-hover:opacity-100">
        edit
      </span>
    </div>
  );
}

/** Renders metadata value with type-aware formatting */
function SmartValue({ fieldId, value }: { fieldId: string; value: string }) {
  if (!value || value === "empty") {
    return <span className="italic text-gray-300">empty</span>;
  }

  const type = detectFieldType(fieldId, value);

  switch (type) {
    case "friends": {
      const friends = value.split(",").filter(Boolean);
      return (
        <span className="flex flex-wrap gap-1">
          {friends.map((f) => (
            <Link
              key={f}
              to={`/admin/v1/web/users/${f.trim()}`}
              className="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700 hover:bg-blue-100"
              onClick={(e) => e.stopPropagation()}
            >
              {f.trim()}
            </Link>
          ))}
        </span>
      );
    }

    case "date": {
      const ts = parseInt(value, 10);
      if (isNaN(ts)) return <span className="text-xs text-gray-600">{value}</span>;
      return (
        <span className="text-xs text-gray-600" title={formatDate(ts)}>
          {formatDateRelative(ts)} ({formatDate(ts)})
        </span>
      );
    }

    case "banned": {
      if (value === "<no>" || value === "false" || !value) {
        return <span className="text-xs text-green-600">No</span>;
      }
      const ts = parseInt(value, 10);
      if (!isNaN(ts)) {
        return (
          <span className="text-xs font-medium text-red-600" title={formatDate(ts)}>
            Banned {formatDateRelative(ts)}
          </span>
        );
      }
      return <span className="text-xs font-medium text-red-600">{value}</span>;
    }

    case "boolean":
      return (
        <span className={`text-xs ${value === "true" ? "text-green-600" : "text-gray-600"}`}>
          {value}
        </span>
      );

    case "json":
      return (
        <input
          type="text"
          readOnly
          value={value}
          className="w-full truncate border-0 bg-transparent text-xs font-mono text-gray-600 outline-none cursor-pointer"
          title={value}
        />
      );

    default:
      return (
        <input
          type="text"
          readOnly
          value={value}
          className="w-full truncate border-0 bg-transparent text-xs text-gray-600 outline-none cursor-pointer"
          title={value}
        />
      );
  }
}
