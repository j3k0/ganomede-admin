import { useState, useEffect } from "react";
import { useNavigate, useParams, Outlet } from "react-router";
import { useUserSearch } from "../../lib/queries/users.js";

export function UserSearch() {
  const navigate = useNavigate();
  const { username } = useParams();
  const [input, setInput] = useState("");
  const [searchQuery, setSearchQuery] = useState(!username ? "" : undefined);
  const { data, isLoading, error } = useUserSearch(
    searchQuery !== undefined ? searchQuery : "",
  );

  // Auto-navigate to profile on single match
  useEffect(() => {
    if (data?.matchingIds.length === 1 && !username) {
      navigate(`/admin/v1/web/users/${data.matchingIds[0]}`, { replace: true });
    }
  }, [data, username, navigate]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = input.trim();
    if (!q) return;
    // If we're on a profile, navigate to search first
    if (username) {
      navigate("/admin/v1/web/users");
    }
    setSearchQuery(q);
  }

  function handleQuickNav(userId: string) {
    setInput("");
    setSearchQuery(undefined);
    navigate(`/admin/v1/web/users/${userId}`);
  }

  // Search bar — always visible
  const searchBar = (
    <form onSubmit={handleSearch} className="mb-4 flex gap-2">
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Search user by name, email, or ID..."
        className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm"
        autoFocus={!username}
      />
      <button
        type="submit"
        disabled={isLoading}
        className="rounded bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
      >
        Find
      </button>
    </form>
  );

  // If viewing a profile, show search bar on top + profile below
  if (username) {
    return (
      <div>
        {searchBar}
        <Outlet />
      </div>
    );
  }

  // Search results page
  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Users</h1>
      {searchBar}

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
              onClick={() => handleQuickNav(id)}
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
