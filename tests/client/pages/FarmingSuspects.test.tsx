// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { FarmingSuspects } from "../../../src/client/pages/FarmingSuspects.js";

vi.mock("../../../src/client/lib/queries/farming.js", () => ({
  useFarmingSuspects: vi.fn(),
}));

import { useFarmingSuspects } from "../../../src/client/lib/queries/farming.js";

const mockUse = vi.mocked(useFarmingSuspects);

function renderWith(data: unknown) {
  mockUse.mockReturnValue({ data, isLoading: false, error: null } as unknown as ReturnType<typeof useFarmingSuspects>);
  const router = createMemoryRouter(
    [{ path: "/admin/v1/web/farming", element: <FarmingSuspects /> }],
    { initialEntries: ["/admin/v1/web/farming"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("FarmingSuspects", () => {
  beforeEach(() => vi.clearAllMocks());

  it("says no scan has run when scannedAt is null", () => {
    renderWith({ scannedAt: null, deviceScan: null, alerts: [] });
    expect(screen.getByText(/No scan has run yet/)).toBeInTheDocument();
    expect(screen.queryByText("Win-rate pairs")).not.toBeInTheDocument();
  });

  it("lists win-rate pairs and device clusters with links to player pages", () => {
    renderWith({
      scannedAt: 1790000000000,
      deviceScan: "ok",
      alerts: [
        { type: "win-rate-outlier", details: { winner: "LeDebris", loser: "ceega453", games: 871, wins: 852, winRate: 97.8 } },
        { type: "device-cluster", details: { device: "9422-abc", users: 2, userIds: ["omiem116", "x/y"] } },
        { type: "something-new", details: {} },
      ],
    });
    expect(screen.getByRole("link", { name: "LeDebris" })).toHaveAttribute("href", "/admin/v1/web/users/LeDebris");
    expect(screen.getByRole("link", { name: "ceega453" })).toHaveAttribute("href", "/admin/v1/web/users/ceega453");
    expect(screen.getByText("871")).toBeInTheDocument();
    expect(screen.getByText("97.8%")).toBeInTheDocument();
    expect(screen.getByText("9422-abc")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "omiem116" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "x/y" })).toHaveAttribute("href", "/admin/v1/web/users/x%2Fy");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows how many accounts were cut from a capped cluster", () => {
    renderWith({
      scannedAt: 1790000000000,
      deviceScan: "ok",
      alerts: [{ type: "device-cluster", details: { device: "d1", users: 52, userIds: ["a", "b"] } }],
    });
    expect(screen.getByText("52")).toBeInTheDocument();
    expect(screen.getByText(/and 50 more/)).toBeInTheDocument();
  });

  it("warns that an empty device list means nothing when the device scan failed", () => {
    renderWith({ scannedAt: 1790000000000, deviceScan: "failed", alerts: [] });
    expect(screen.getByRole("alert")).toHaveTextContent(/device scan failed/);
  });

  it("warns when the device scan is disabled", () => {
    renderWith({ scannedAt: 1790000000000, deviceScan: "disabled", alerts: [] });
    expect(screen.getByRole("alert")).toHaveTextContent(/disabled/);
  });
});
