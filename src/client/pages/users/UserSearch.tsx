import { useState, useEffect } from "react";
import { useNavigate, useParams, Outlet } from "react-router";
import { useUserSearch } from "../../lib/queries/users.js";

export function UserSearch() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [input, setInput] = useState(username ?? "");
  const [searchQuery, setSearchQuery] = useState(username ?? "");
  const { data, isLoading, error } = useUserSearch(searchQuery);

  // Auto-navigate to profile on single match
  useEffect(() => {
    if (data?.matchingIds.length === 1 && !username) {
      navigate(`/admin/v1/web/users/${data.matchingIds[0]}`, { replace: true });
    }
  }, [data, username, navigate]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (input.trim()) {
      setSearchQuery(input.trim());
    }
  }

  // If viewing a profile (has :username param), show Outlet
  if (username) {
    return (
      <div>
        <button
          onClick={() => {
            setSearchQuery("");
            setInput("");
            navigate("/admin/v1/web/users");
          }}
          className="mb-4 text-sm text-blue-600 hover:underline"
        >
          &larr; Back to search
        </button>
        <Outlet />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">User Search</h1>

      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Username, email, or user ID"
          className="flex-1 rounded border border-gray-300 px-3 py-2"
          autoFocus
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Find
        </button>
      </form>

      {isLoading && <p className="text-gray-500">Searching...</p>}

      {error && (
        <p className="text-red-600">
          Error: {error instanceof Error ? error.message : "Search failed"}
        </p>
      )}

      {data && !isLoading && data.matchingIds.length === 0 && (
        <p className="text-gray-500">No users found for &quot;{data.query}&quot;</p>
      )}

      {data && !isLoading && data.matchingIds.length > 1 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500">Multiple matches found:</p>
          {data.matchingIds.map((id) => (
            <button
              key={id}
              onClick={() => navigate(`/admin/v1/web/users/${id}`)}
              className="block w-full rounded border border-gray-200 p-3 text-left hover:bg-gray-50"
            >
              {id}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
