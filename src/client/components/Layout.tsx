import { NavLink, Outlet, useNavigate } from "react-router";
import { getConfig } from "../lib/config.js";
import { api } from "../lib/api.js";

const BASE = "/admin/v1/web";

function navLinkClass({ isActive }: { isActive: boolean }) {
  return `px-3 py-2 rounded text-sm font-medium ${
    isActive ? "bg-gray-900 text-white" : "text-gray-300 hover:bg-gray-700 hover:text-white"
  }`;
}

export function Layout() {
  const config = getConfig();
  const navigate = useNavigate();
  const hasService = (name: string) => config.services.includes(name);

  async function handleLogout() {
    try {
      await api.post("/logout");
    } finally {
      navigate(`${BASE}/login`, { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-gray-800">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex items-center gap-1">
              <NavLink to={`${BASE}`} end className="mr-4 text-lg font-bold text-white">
                {config.brandingTitle} Administration
              </NavLink>

              {hasService("virtualcurrency") && (
                <>
                  <NavLink to={`${BASE}/items`} className={navLinkClass}>
                    Items
                  </NavLink>
                  <NavLink to={`${BASE}/packs`} className={navLinkClass}>
                    Packs
                  </NavLink>
                </>
              )}

              {hasService("users") && (
                <NavLink to={`${BASE}/users`} className={navLinkClass}>
                  Users
                </NavLink>
              )}

              {hasService("data") && (
                <NavLink to={`${BASE}/data`} className={navLinkClass}>
                  Data
                </NavLink>
              )}

              {hasService("chat") && (
                <>
                  <NavLink to={`${BASE}/reported`} className={navLinkClass}>
                    Reported Users
                  </NavLink>
                  <NavLink to={`${BASE}/chat`} className={navLinkClass}>
                    Chat
                  </NavLink>
                </>
              )}
            </div>

            <button
              onClick={handleLogout}
              className="rounded px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
