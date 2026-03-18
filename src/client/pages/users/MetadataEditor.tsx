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
