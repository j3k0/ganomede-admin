import { createBrowserRouter, Navigate } from "react-router";
import { RouteErrorPage } from "./components/RouteErrorPage.js";
import { AuthGuard } from "./components/AuthGuard.js";
import { Layout } from "./components/Layout.js";
import { Login } from "./pages/Login.js";
import { NotFound } from "./pages/NotFound.js";
import { Placeholder } from "./pages/Placeholder.js";

const BASE = "/admin/v1/web";

export const router = createBrowserRouter([
  {
    path: BASE,
    errorElement: <RouteErrorPage />,
    children: [
      { path: "login", element: <Login /> },
      {
        element: <AuthGuard />,
        children: [
          {
            element: <Layout />,
            children: [
              { index: true, element: <Navigate to="users" replace /> },
              { path: "users", element: <Placeholder title="Users" /> },
              { path: "users/:username", element: <Placeholder title="User Profile" /> },
              { path: "items", element: <Placeholder title="Items" /> },
              { path: "packs", element: <Placeholder title="Packs" /> },
              { path: "data", element: <Placeholder title="Data" /> },
              { path: "data/:docId", element: <Placeholder title="Data Document" /> },
              { path: "reported", element: <Placeholder title="Reported Users" /> },
              { path: "chat", element: <Placeholder title="Chat" /> },
              { path: "chat/:username1,:username2", element: <Placeholder title="Chat Room" /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
