// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { Chat } from "../../../src/client/pages/Chat.js";

vi.mock("../../../src/client/lib/queries/users.js", () => ({
  useChatRoom: vi.fn(),
}));

import { useChatRoom } from "../../../src/client/lib/queries/users.js";

const mockUseChatRoom = vi.mocked(useChatRoom);

function renderAt(path: string) {
  const router = createMemoryRouter(
    [{ path: "/admin/v1/web/chat/:usernames?", element: <Chat /> }],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

describe("Chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChatRoom.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: null,
    } as unknown as ReturnType<typeof useChatRoom>);
  });

  it("parses comma-separated usernames from the route param", () => {
    renderAt("/admin/v1/web/chat/alice,bob");

    expect(mockUseChatRoom).toHaveBeenCalledWith("alice", "bob");
    expect(screen.getByPlaceholderText("Username 1")).toHaveValue("alice");
    expect(screen.getByPlaceholderText("Username 2")).toHaveValue("bob");
  });

  it("does not query when no usernames are in the URL", () => {
    renderAt("/admin/v1/web/chat");

    // enabled: !!username1 && !!username2 — empty strings keep the query off
    expect(mockUseChatRoom).toHaveBeenCalledWith("", "");
    expect(screen.getByPlaceholderText("Username 1")).toHaveValue("");
    expect(screen.getByPlaceholderText("Username 2")).toHaveValue("");
  });

  it("does not query when only one username is present", () => {
    renderAt("/admin/v1/web/chat/alice");

    expect(mockUseChatRoom).toHaveBeenCalledWith("alice", "");
  });
});

describe("router config", () => {
  it("declares the chat route with a single :usernames param", async () => {
    // ":username1,:username2" is parsed by React Router as ONE param named
    // "username1,:username2", which breaks useParams in Chat (FOV-362)
    const { router } = await import("../../../src/client/router.js");

    type RouteLike = { path?: string; children?: RouteLike[] };
    const paths: string[] = [];
    const walk = (routes: RouteLike[]) => {
      for (const r of routes) {
        if (r.path) paths.push(r.path);
        if (r.children) walk(r.children);
      }
    };
    walk(router.routes as RouteLike[]);

    expect(paths).toContain("chat/:usernames");
    expect(paths.some((p) => p.includes(","))).toBe(false);
  });
});
