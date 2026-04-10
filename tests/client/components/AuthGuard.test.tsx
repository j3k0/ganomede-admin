// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { AuthGuard } from "../../../src/client/components/AuthGuard.js";

vi.mock("../../../src/client/lib/api.js", () => ({
  api: {
    get: vi.fn(),
  },
}));

import { api } from "../../../src/client/lib/api.js";
const mockGet = vi.mocked(api.get);

function renderWithRouter(initialPath: string) {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route path="/admin/v1/web/login" element={<div>Login Page</div>} />
        <Route element={<AuthGuard />}>
          <Route path="/admin/v1/web/users" element={<div>Users Page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("AuthGuard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows loading state while checking auth", () => {
    mockGet.mockReturnValue(new Promise(() => {}));
    renderWithRouter("/admin/v1/web/users");
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });

  it("renders outlet when authenticated", async () => {
    mockGet.mockResolvedValue({ success: true });
    renderWithRouter("/admin/v1/web/users");
    await waitFor(() => {
      expect(screen.getByText("Users Page")).toBeInTheDocument();
    });
  });

  it("redirects to login when not authenticated", async () => {
    mockGet.mockRejectedValue({ status: 401 });
    renderWithRouter("/admin/v1/web/users");
    await waitFor(() => {
      expect(screen.getByText("Login Page")).toBeInTheDocument();
    });
  });
});
