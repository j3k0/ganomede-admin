import { Link } from "react-router";
import { useHighlyReported } from "../lib/queries/users.js";

export function Reports() {
  const { data, isLoading, error } = useHighlyReported();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Most Reported Users</h1>

      {isLoading && <p className="text-gray-500">Loading...</p>}
      {error && <p className="text-red-600">{error.message}</p>}

      {data && data.length === 0 && (
        <p className="text-gray-500">No reported users</p>
      )}

      {data && data.length > 0 && (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-gray-500">
              <th className="pb-2">User</th>
              <th className="pb-2 text-right">Reports</th>
            </tr>
          </thead>
          <tbody>
            {data.map((user) => (
              <tr key={user.target} className="border-b hover:bg-gray-50">
                <td className="py-2">
                  <Link to={`/admin/v1/web/users/${user.target}`} className="text-blue-600 hover:underline">
                    {user.target}
                  </Link>
                </td>
                <td className="py-2 text-right">{user.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
