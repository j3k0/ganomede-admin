import { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router";
import { api } from "../lib/api.js";

export function AuthGuard() {
  const [state, setState] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    api
      .get("/islogged")
      .then(() => setState("authenticated"))
      .catch(() => setState("unauthenticated"));
  }, []);

  if (state === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-gray-500">Checking authentication...</p>
      </div>
    );
  }

  if (state === "unauthenticated") {
    return <Navigate to="/admin/v1/web/login" replace />;
  }

  return <Outlet />;
}
