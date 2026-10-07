import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useRanking, useAdjustRanking } from "../../lib/queries/users.js";
import { ApiError } from "../../lib/api.js";
import { formatDate } from "../../lib/utils.js";

/** Keep in sync with src/server/routes/ranking.ts */
const MAX_DELTA = 100_000;
const MAX_REASON_LENGTH = 200;

/**
 * Leaderboard points + rank, manual +/- adjustment with a reason, and the
 * adjustment history (FOV-1545).
 */
export function Ranking({ userId }: { userId: string }) {
  const { data, isLoading, error } = useRanking(userId);
  const adjust = useAdjustRanking(userId);
  const [direction, setDirection] = useState<"remove" | "add">("remove");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState(false);
  const level = data?.level;

  // Level changed under an armed confirm button (refetch after a game):
  // disarm so the admin re-confirms against the current value.
  useEffect(() => {
    setConfirming(false);
  }, [level]);

  if (isLoading) return <p className="text-sm text-gray-500">Loading ranking...</p>;
  if (error) {
    const msg = error instanceof ApiError && error.status === 404 ? "No ranking data for this player." : error.message;
    return <p className="text-sm text-gray-500">{msg}</p>;
  }
  if (!data) return null;

  const num = Number(amount);
  const amountValid = Number.isInteger(num) && num > 0 && num <= MAX_DELTA;
  const reasonValid = reason.trim().length > 0 && reason.length <= MAX_REASON_LENGTH;
  const delta = direction === "remove" ? -num : num;
  const newLevel = Math.max(0, data.level + delta);

  function handleSubmit() {
    if (!amountValid || !reasonValid || !data || adjust.isPending) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    adjust.mutate(
      { delta, reason: reason.trim() },
      {
        onSuccess: (res) => {
          toast.success(`${userId}: ${data.level} → ${res.level} points`);
          setAmount("");
          setReason("");
          setConfirming(false);
        },
        onError: (err) => {
          toast.error(err.message);
          setConfirming(false);
        },
      },
    );
  }

  return (
    <div className="space-y-2 rounded bg-gray-50 px-3 py-2 text-sm">
      <div className="flex items-baseline gap-4">
        <span>
          <span className="font-mono text-lg font-bold">{data.level}</span> points
        </span>
        <span className="text-gray-600">{data.rank > 0 ? `#${data.rank}` : "Unranked"}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={direction}
          onChange={(e) => { setDirection(e.target.value as "remove" | "add"); setConfirming(false); }}
          className="rounded border px-2 py-1"
          aria-label="Direction"
        >
          <option value="remove">Remove</option>
          <option value="add">Add</option>
        </select>
        <input
          type="number"
          min="1"
          max={MAX_DELTA}
          value={amount}
          onChange={(e) => { setAmount(e.target.value); setConfirming(false); }}
          placeholder="Points"
          aria-label="Points"
          className="w-24 rounded border px-2 py-1"
        />
        <input
          type="text"
          value={reason}
          maxLength={MAX_REASON_LENGTH}
          onChange={(e) => { setReason(e.target.value); setConfirming(false); }}
          placeholder="Reason (required)"
          aria-label="Reason"
          className="min-w-0 flex-1 rounded border px-2 py-1"
        />
        <button
          onClick={handleSubmit}
          disabled={!amountValid || !reasonValid || adjust.isPending}
          className="rounded bg-orange-600 px-3 py-1 text-white hover:bg-orange-700 disabled:opacity-50"
        >
          {adjust.isPending ? "Applying..." : confirming ? `Confirm ${data.level} → ${newLevel}?` : "Apply"}
        </button>
        {confirming && !adjust.isPending && (
          <button onClick={() => setConfirming(false)} className="text-gray-500 hover:underline">
            Cancel
          </button>
        )}
      </div>

      {adjust.isPending && (
        <p className="text-xs text-gray-500">Waiting for the statistics worker, this can take up to 30 seconds...</p>
      )}

      {data.adjustments.length > 0 && (
        <table className="w-full text-xs">
          <thead className="text-left text-gray-400">
            <tr>
              <th className="font-normal">Date</th>
              <th className="font-normal">Change</th>
              <th className="font-normal">New</th>
              <th className="font-normal">Reason</th>
            </tr>
          </thead>
          <tbody>
            {[...data.adjustments].reverse().map((a, i) => (
              <tr key={`${a.date}-${i}`} className="border-t border-gray-200">
                <td className="whitespace-nowrap pr-2">{formatDate(a.date * 1000)}</td>
                <td className={`pr-2 font-mono ${a.delta < 0 ? "text-red-700" : "text-green-700"}`}>
                  {a.delta > 0 ? `+${a.delta}` : a.delta}
                </td>
                <td className="pr-2 font-mono">{a.newLevel}</td>
                <td className="break-words">{a.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
