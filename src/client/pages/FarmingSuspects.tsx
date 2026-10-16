import { Link } from "react-router";
import {
  useFarmingSuspects,
  type WinRateAlert,
  type DeviceClusterAlert,
} from "../lib/queries/farming.js";
import { formatDate, formatDateRelative } from "../lib/utils.js";

function UserLink({ id }: { id: string }) {
  return (
    <Link to={`/admin/v1/web/users/${encodeURIComponent(id)}`} className="text-blue-600 hover:underline">
      {id}
    </Link>
  );
}

const DEVICE_SCAN_WARNING: Record<string, string> = {
  failed: "The device scan failed on the last run: an empty device list does not mean there are no clusters.",
  disabled: "The device scan is disabled on the server: device clusters are not checked.",
};

/**
 * Latest farming-detection scan (FOV-1786). Read-only: the server keeps only
 * the latest scan, and penalties stay manual from the player's page.
 */
export function FarmingSuspects() {
  const { data, isLoading, error } = useFarmingSuspects();

  const winRate = (data?.alerts ?? []).filter((a): a is WinRateAlert => a.type === "win-rate-outlier");
  const devices = (data?.alerts ?? []).filter((a): a is DeviceClusterAlert => a.type === "device-cluster");

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Farming Suspects</h1>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      {data && data.scannedAt === null && (
        <p className="text-gray-500">No scan has run yet. The detector runs every 6 hours.</p>
      )}

      {data && data.scannedAt !== null && (
        <>
          <p className="mb-4 text-sm text-gray-500">
            Last scan: {formatDate(data.scannedAt)} ({formatDateRelative(data.scannedAt)})
          </p>

          <h2 className="mb-2 text-lg font-semibold">Win-rate pairs</h2>
          {winRate.length === 0 ? (
            <p className="mb-6 text-sm text-gray-500">None</p>
          ) : (
            <table className="mb-6 w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">Winner</th>
                  <th className="pb-2">Loser</th>
                  <th className="pb-2 text-right">Games</th>
                  <th className="pb-2 text-right">Wins</th>
                  <th className="pb-2 text-right">Win %</th>
                </tr>
              </thead>
              <tbody>
                {winRate.map(({ details: d }) => (
                  <tr key={`${d.winner}/${d.loser}`} className="border-b hover:bg-gray-50">
                    <td className="py-2"><UserLink id={d.winner} /></td>
                    <td className="py-2"><UserLink id={d.loser} /></td>
                    <td className="py-2 text-right">{d.games}</td>
                    <td className="py-2 text-right">{d.wins}</td>
                    <td className="py-2 text-right">{d.winRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h2 className="mb-2 text-lg font-semibold">Device clusters</h2>
          {data.deviceScan && DEVICE_SCAN_WARNING[data.deviceScan] && (
            <p role="alert" className="mb-2 rounded bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              {DEVICE_SCAN_WARNING[data.deviceScan]}
            </p>
          )}
          {devices.length === 0 ? (
            <p className="text-sm text-gray-500">None</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-gray-500">
                  <th className="pb-2">Device</th>
                  <th className="pb-2 text-right">Accounts</th>
                  <th className="pb-2 pl-4">Account ids</th>
                </tr>
              </thead>
              <tbody>
                {devices.map(({ details: d }) => (
                  <tr key={d.device} className="border-b align-top hover:bg-gray-50">
                    <td className="py-2 font-mono text-xs break-all">{d.device}</td>
                    <td className="py-2 text-right">{d.users}</td>
                    <td className="py-2 pl-4">
                      <div className="flex flex-wrap gap-x-3">
                        {d.userIds.map((id) => <UserLink key={id} id={id} />)}
                      </div>
                      {d.users > d.userIds.length && (
                        <p className="text-xs text-gray-500">
                          … and {d.users - d.userIds.length} more (list capped at {d.userIds.length})
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
