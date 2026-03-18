// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { Layout } from "../../../src/client/components/Layout.js";

vi.mock("../../../src/client/lib/config.js", () => ({
  getConfig: vi.fn(),
}));

vi.mock("../../../src/client/lib/api.js", () => ({
  api: { post: vi.fn() },
}));

import { getConfig } from "../../../src/client/lib/config.js";
const mockGetConfig = vi.mocked(getConfig);

describe("Layout", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("renders navbar with branding title", () => {
    mockGetConfig.mockReturnValue({
      brandingTitle: "Triominos",
      services: ["users", "virtualcurrency"],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Triominos Administration")).toBeInTheDocument();
  });

  it("shows nav links for available services", () => {
    mockGetConfig.mockReturnValue({
      brandingTitle: "Test",
      services: ["users", "virtualcurrency", "data", "chat"],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Items")).toBeInTheDocument();
    expect(screen.getByText("Packs")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("Data")).toBeInTheDocument();
    expect(screen.getByText("Chat")).toBeInTheDocument();
  });

  it("hides Data link when data service is unavailable", () => {
    mockGetConfig.mockReturnValue({
      brandingTitle: "Test",
      services: ["users", "virtualcurrency"],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.queryByText("Data")).not.toBeInTheDocument();
  });

  it("shows logout button", () => {
    mockGetConfig.mockReturnValue({
      brandingTitle: "Test",
      services: [],
      currencies: [],
      chatRoomPrefix: "",
      userMetadataList: [],
    });

    render(
      <MemoryRouter>
        <Layout />
      </MemoryRouter>,
    );

    expect(screen.getByText("Logout")).toBeInTheDocument();
  });
});
