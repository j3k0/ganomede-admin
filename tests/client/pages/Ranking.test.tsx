// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { format } from "date-fns";
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

function setRanking(data: unknown) {
  mockUseRanking.mockReturnValue({ data, isLoading: false } as unknown as ReturnType<typeof useRanking>);
}

function renderRanking(data: unknown) {
  setRanking(data);
  return render(<Ranking userId="ledebris" />);
}

function fillAndConfirm(points: string, reason: string, confirmLabel: string) {
  fireEvent.change(screen.getByLabelText("Points"), { target: { value: points } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: reason } });
  fireEvent.click(screen.getByRole("button", { name: "Apply" }));
  fireEvent.click(screen.getByRole("button", { name: confirmLabel }));
}

describe("Ranking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutate.mockReset();
    mockUseAdjust.mockReturnValue({ mutate, isPending: false } as unknown as ReturnType<typeof useAdjustRanking>);
  });

  it("shows points, rank and history; renders reason as text", () => {
    renderRanking({
      username: "ledebris",
      level: 1200,
      rank: 3,
      adjustments: [{ date: 1759830000, delta: -500, reason: "<b>farming</b>", by: "admin", newLevel: 700 }],
    });
    expect(screen.getByText("1200")).toBeInTheDocument();
    expect(screen.getByText("#3")).toBeInTheDocument();
    expect(screen.getByText("-500")).toBeInTheDocument();
    expect(screen.getByText("<b>farming</b>")).toBeInTheDocument();
    // date is in seconds
    expect(screen.getByText(format(new Date(1759830000 * 1000), "yyyy-MM-dd HH:mm"))).toBeInTheDocument();
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

  it("blocks re-submit after a 202 until the level changes", () => {
    const base = { username: "ledebris", rank: 3, adjustments: [] };
    mutate.mockImplementation((_vars, opts) => opts.onSuccess(undefined));
    const { rerender } = renderRanking({ ...base, level: 1200 });
    fillAndConfirm("500", "farming", "Confirm 1200 → 700?");
    expect(mutate).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Adjustment queued/)).toBeInTheDocument();
    expect(mockUseRanking).toHaveBeenLastCalledWith("ledebris", 3000);

    // Same level after refetch: still blocked.
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "farming" } });
    expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();

    // Queued entry applied: unblocked, polling stops.
    setRanking({ ...base, level: 700 });
    rerender(<Ranking userId="ledebris" />);
    expect(screen.queryByText(/Adjustment queued/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Apply" })).not.toBeDisabled();
    expect(mockUseRanking).toHaveBeenLastCalledWith("ledebris", false);
  });

  it("unblocks after the pending timeout", () => {
    vi.useFakeTimers();
    try {
      mutate.mockImplementation((_vars, opts) => opts.onSuccess(undefined));
      renderRanking({ username: "x", level: 0, rank: 0, adjustments: [] });
      fireEvent.change(screen.getByLabelText("Direction"), { target: { value: "add" } });
      fillAndConfirm("10", "refund", "Confirm 0 → 10?");
      expect(screen.getByText(/Adjustment queued/)).toBeInTheDocument();
      act(() => { vi.advanceTimersByTime(60_000); });
      expect(screen.queryByText(/Adjustment queued/)).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("disarms the confirm button when the level changes", () => {
    const base = { username: "ledebris", rank: 3, adjustments: [] };
    const { rerender } = renderRanking({ ...base, level: 1200 });
    fireEvent.change(screen.getByLabelText("Points"), { target: { value: "500" } });
    fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "farming" } });
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(screen.getByRole("button", { name: "Confirm 1200 → 700?" })).toBeInTheDocument();

    setRanking({ ...base, level: 1230 });
    rerender(<Ranking userId="ledebris" />);
    expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
    expect(mutate).not.toHaveBeenCalled();
  });
});
