import { createBrowserRouter, Navigate } from "react-router";
import { RouteErrorPage } from "./components/RouteErrorPage.js";
import { AuthGuard } from "./components/AuthGuard.js";
import { Layout } from "./components/Layout.js";
import { Login } from "./pages/Login.js";
import { NotFound } from "./pages/NotFound.js";
import { Placeholder } from "./pages/Placeholder.js";
import { Data } from "./pages/Data.js";
import { Items } from "./pages/Items.js";
import { Packs } from "./pages/Packs.js";
import { Reports } from "./pages/Reports.js";
import { Chat } from "./pages/Chat.js";
import { UserSearch } from "./pages/users/UserSearch.js";
import { UserProfile } from "./pages/users/UserProfile.js";

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
              { path: "users", element: <UserSearch />, children: [
                { path: ":username", element: <UserProfile /> },
              ] },
              { path: "items", element: <Items /> },
              { path: "packs", element: <Packs /> },
              { path: "data", element: <Data /> },
              { path: "data/:docId", element: <Data /> },
              { path: "reported", element: <Reports /> },
              { path: "chat", element: <Chat /> },
              { path: "chat/:username1,:username2", element: <Chat /> },
            ],
          },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
