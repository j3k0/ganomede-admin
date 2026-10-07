// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Ranking } from "../../../src/client/pages/users/Ranking.js";

vi.mock("../../../src/client/lib/queries/users.js", () => ({
  useRanking: vi.fn(),
  useAdjustRanking: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { useRanking, useAdjustRanking } from "../../../src/client/lib/queries/users.js";

const mockUseRanking = vi.mocked(useRanking);
const mockUseAdjust = vi.mocked(useAdjustRanking);
const mutate = vi.fn();

function renderRanking(data: unknown) {
  mockUseRanking.mockReturnValue({ data, isLoading: false } as unknown as ReturnType<typeof useRanking>);
  return render(<Ranking userId="ledebris" />);
}

describe("Ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseAdjust.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useAdjustRanking>);
  });

  it("shows points, rank and history; renders reason as text", () => {
    renderRanking({
      username: "ledebris",
      level: 1200,
      rank: 3,
      adjustments: [{ date: 1759830000000, delta: -500, reason: "<b>farming</b>", by: "admin", newLevel: 700 }],
    });
    expect(screen.getByText("1200")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("-500")).toBeInTheDocument();
    expect(screen.getByText("<b>farming</b>")).toBeInTheDocument();
  });

  it("shows Unranked for rank 0", () => {
    renderRanking({ username: "x", level: 0, rank: 0, adjustments: [] });
    expect(screen.getByText("Unranked")).toBeInTheDocument();
  });

  it("requires a reason and asks for confirmation with old → new before sending", () => {
    renderRanking({ username: "ledebris", level: 1200, rank: 3, adjustments: [] });
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "5000" } });
    const apply = screen.getByRole("button", { name: "Apply" });
    expect(apply).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "farming" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(mutate).not.toHaveBeenCalled();

    // Floored at 0
    fireEvent.click(screen.getByRole("button", { name: "Confirm 1200 → 0?" }));
    expect(mutate).toHaveBeenCalledWith(
      { delta: -5000, reason: "farming", expectedLevel: 1200 },
      expect.anything(),
    );
  });

  it("sends a positive delta when adding points", () => {
    renderRanking({ username: "victim", level: 100, rank: 50, adjustments: [] });
    fireEvent.change(screen.getByLabelText("Direction"), { target: { value: "add" } });
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "30" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "refund" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm 100 → 130?" }));
    expect(mutate).toHaveBeenCalledWith({ delta: 30, reason: "refund", expectedLevel: 100 }, expect.anything());
  });

  it("rejects non-integer amounts", () => {
    renderRanking({ username: "x", level: 100, rank: 1, adjustments: [] });
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "2.5" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "r" } });
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
  });
});
