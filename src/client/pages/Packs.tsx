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
