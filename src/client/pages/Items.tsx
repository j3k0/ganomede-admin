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
