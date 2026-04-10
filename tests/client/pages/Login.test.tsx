// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Login } from "../../../src/client/pages/Login.js";

vi.mock("../../../src/client/lib/api.js", () => ({
  api: { post: vi.fn() },
  ApiError: class extends Error {
    status: number;
    constructor(status: number) {
      super("error");
      this.status = status;
    }
  },
}));

vi.mock("../../../src/client/lib/config.js", () => ({
  getConfig: () => ({
    brandingTitle: "TestApp",
    services: [],
    currencies: [],
    chatRoomPrefix: "",
    userMetadataList: [],
  }),
}));

import { api } from "../../../src/client/lib/api.js";
const mockPost = vi.mocked(api.post);

describe("Login", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders login form with branding", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    expect(screen.getByText(/login to testapp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /login/i })).toBeInTheDocument();
  });

  it("submits credentials and navigates on success", async () => {
    const user = userEvent.setup();
    mockPost.mockResolvedValue({ success: true });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "secret");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(mockPost).toHaveBeenCalledWith("/login", {
        username: "admin",
        password: "secret",
      });
    });
  });

  it("shows error on failed login", async () => {
    const user = userEvent.setup();
    mockPost.mockRejectedValue(new Error("Invalid username or password."));

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );

    await user.type(screen.getByLabelText(/username/i), "admin");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /login/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid username or password/i)).toBeInTheDocument();
    });
  });
});
