import { Link } from "react-router";
import { useReportsBlocks } from "../../lib/queries/users.js";
import { formatDate } from "../../lib/utils.js";

export function ReportsBlocks({ userId }: { userId: string }) {
  const { data, isLoading } = useReportsBlocks(userId);

  if (isLoading) return <p className="text-sm text-gray-500">Loading reports...</p>;
  if (!data) return null;

  const { reportedBy = [], blockedBy = [] } = data;

  if (reportedBy.length === 0 && blockedBy.length === 0) {
    return <p className="text-sm text-gray-500">No reports or blocks</p>;
  }

  return (
    <div className="space-y-3">
      {reportedBy.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-red-600">Reported By ({reportedBy.length})</h4>
          <ul className="mt-1 space-y-1">
            {reportedBy.map((r, i) => (
              <li key={i} className="text-sm">
                <Link
                  to={`/admin/v1/web/chat/${userId},${r.username}`}
                  className="text-blue-600 hover:underline"
                >
                  {r.username}
                </Link>
                <span className="ml-2 text-gray-400">{formatDate(r.on)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {blockedBy.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-orange-600">Blocked By ({blockedBy.length})</h4>
          <ul className="mt-1 space-y-1">
            {blockedBy.map((b, i) => (
              <li key={i} className="text-sm">
                <Link
                  to={`/admin/v1/web/chat/${userId},${b.username}`}
                  className="text-blue-600 hover:underline"
                >
                  {b.username}
                </Link>
                <span className="ml-2 text-gray-400">{formatDate(b.on)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
