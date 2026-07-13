import { useState } from "react";
import { toast } from "sonner";
import { useUserGames, useDeleteGame, type Game } from "../../lib/queries/users.js";

function StatusBadge({ status }: { status: Game["status"] }) {
  const styles: Record<string, string> = {
    active: "bg-blue-100 text-blue-800",
    inactive: "bg-yellow-100 text-yellow-800",
    gameover: "bg-gray-200 text-gray-600",
  };
  return (
    <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[status] ?? "bg-gray-100 text-gray-500"}`}>
      {status}
    </span>
  );
}

function GameRow({ game, userId }: { game: Game; userId: string }) {
  const del = useDeleteGame(userId);
  const [confirming, setConfirming] = useState(false);

  function handleDelete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    del.mutate(game.id, {
      onSuccess: (data) => {
        const failed = data.results.filter((r) => !r.success);
        if (failed.length === 0) {
          toast.success(`Game ${game.id.slice(0, 8)} deleted (left for all players)`);
        } else {
          toast.error(`Game ${game.id.slice(0, 8)}: ${failed.length} player(s) failed to leave`);
        }
        setConfirming(false);
      },
      onError: (err) => toast.error(err.message),
    });
  }

  return (
    <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-2 py-1.5 last:border-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <StatusBadge status={game.status} />
          <span className="truncate font-mono text-xs text-gray-600" title={game.id}>
            {game.id}
          </span>
        </div>
        <div className="mt-0.5 text-xs text-gray-400">
          {game.players.join(" vs ")}
          {game.waiting?.length ? ` · waiting: ${game.waiting.join(", ")}` : ""}
        </div>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={handleDelete}
          disabled={del.isPending}
          className={`rounded px-2 py-1 text-xs text-white ${
            confirming ? "bg-red-700 hover:bg-red-800" : "bg-red-500 hover:bg-red-600"
          } ${del.isPending ? "opacity-50" : ""}`}
        >
          {del.isPending ? "..." : confirming ? "Confirm?" : "Delete"}
        </button>
        {confirming && !del.isPending && (
          <button onClick={() => setConfirming(false)} className="text-xs text-gray-500 hover:underline">
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export function Games({ userId }: { userId: string }) {
  const { data: games, isLoading, error } = useUserGames(userId);

  if (isLoading) return <p className="text-sm text-gray-500">Loading games...</p>;
  if (error) return <p className="text-sm text-red-500">Failed to load games</p>;
  if (!games || games.length === 0) return <p className="text-sm text-gray-500">No active or gameover games</p>;

  return (
    <div className="max-h-48 overflow-y-auto rounded border">
      {games.map((g) => (
        <GameRow key={g.id} game={g} userId={userId} />
      ))}
    </div>
  );
}
