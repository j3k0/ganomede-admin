import { Link } from "react-router";
import { useReportsBlocks } from "../../lib/queries/users.js";
import { formatDateRelative } from "../../lib/utils.js";

interface Entry {
  username: string;
  on: string;
}

/** Group entries by username, count occurrences, keep the most recent date */
function summarize(entries: Entry[]): Array<{ username: string; count: number; lastOn: string }> {
  const map = new Map<string, { count: number; lastOn: string }>();
  for (const e of entries) {
    const existing = map.get(e.username);
    if (!existing) {
      map.set(e.username, { count: 1, lastOn: e.on });
    } else {
      existing.count++;
      if (new Date(e.on).getTime() > new Date(existing.lastOn).getTime()) {
        existing.lastOn = e.on;
      }
    }
  }
  // Sort by most recent first
  return [...map.entries()]
    .map(([username, { count, lastOn }]) => ({ username, count, lastOn }))
    .sort((a, b) => new Date(b.lastOn).getTime() - new Date(a.lastOn).getTime());
}

export function ReportsBlocks({ userId }: { userId: string }) {
  const { data, isLoading } = useReportsBlocks(userId);

  if (isLoading) return <p className="text-sm text-gray-500">Loading reports...</p>;
  if (!data) return null;

  const { reportedBy = [], blockedBy = [] } = data;

  if (reportedBy.length === 0 && blockedBy.length === 0) {
    return <p className="text-sm text-gray-500">No reports or blocks</p>;
  }

  return (
    <div className="space-y-2">
      {reportedBy.length > 0 && (
        <Section
          label="Reported By"
          color="text-red-600"
          total={reportedBy.length}
          entries={summarize(reportedBy)}
          userId={userId}
        />
      )}
      {blockedBy.length > 0 && (
        <Section
          label="Blocked By"
          color="text-orange-600"
          total={blockedBy.length}
          entries={summarize(blockedBy)}
          userId={userId}
        />
      )}
    </div>
  );
}

function Section({
  label,
  color,
  total,
  entries,
  userId,
}: {
  label: string;
  color: string;
  total: number;
  entries: Array<{ username: string; count: number; lastOn: string }>;
  userId: string;
}) {
  return (
    <div>
      <h4 className={`text-xs font-semibold ${color}`}>
        {label} ({total})
      </h4>
      <div className="mt-1 flex flex-wrap gap-x-1.5 gap-y-1">
        {entries.map((e) => (
          <Link
            key={e.username}
            to={`/admin/v1/web/chat/${userId},${e.username}`}
            className="inline-flex items-baseline gap-1 text-xs text-blue-600 hover:underline"
            title={`Last: ${formatDateRelative(e.lastOn)}`}
          >
            <span>{e.username}</span>
            {e.count > 1 && (
              <span className="text-gray-400">x{e.count}</span>
            )}
            <span className="text-gray-400">{formatDateRelative(e.lastOn)}</span>
            {entries.indexOf(e) < entries.length - 1 && <span className="text-gray-300">,</span>}
          </Link>
        ))}
      </div>
    </div>
  );
}
