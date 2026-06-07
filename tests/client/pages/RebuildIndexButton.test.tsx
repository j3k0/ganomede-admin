// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RebuildIndexButton } from "../../../src/client/pages/Data.js";

vi.mock("../../../src/client/lib/queries/data.js", () => ({
  useRebuildIndex: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useRebuildIndex } from "../../../src/client/lib/queries/data.js";
import { toast } from "sonner";

const mockMutate = vi.fn();
const mockUseRebuildIndex = vi.mocked(useRebuildIndex);

describe("RebuildIndexButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRebuildIndex.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
    } as any);
  });

  it("renders the initial button", () => {
    render(<RebuildIndexButton />);

    const button = screen.getByRole("button", { name: /rebuild index/i });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
    expect(button.className).toContain("bg-orange-600");
    // No cancel button visible
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("enters confirmation mode on first click", async () => {
    const user = userEvent.setup();
    render(<RebuildIndexButton />);

    await user.click(screen.getByRole("button", { name: /rebuild index/i }));

    // Button text changes to confirm
    const confirmBtn = screen.getByRole("button", { name: /confirm rebuild\?/i });
    expect(confirmBtn).toBeInTheDocument();
    expect(confirmBtn.className).toContain("bg-yellow-600");
    // Cancel button appears
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    // Mutate not called yet
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("cancels confirmation and returns to initial state", async () => {
    const user = userEvent.setup();
    render(<RebuildIndexButton />);

    // Enter confirmation
    await user.click(screen.getByRole("button", { name: /rebuild index/i }));
    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();

    // Click cancel
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    // Back to initial
    expect(screen.getByRole("button", { name: /rebuild index/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("calls mutate on confirmation click", async () => {
    const user = userEvent.setup();
    render(<RebuildIndexButton />);

    // Enter confirmation
    await user.click(screen.getByRole("button", { name: /rebuild index/i }));
    // Click confirm
    await user.click(screen.getByRole("button", { name: /confirm rebuild\?/i }));

    expect(mockMutate).toHaveBeenCalledWith(undefined, expect.objectContaining({
      onSuccess: expect.any(Function),
      onError: expect.any(Function),
    }));
  });

  it("shows success toast and resets confirmation on success", async () => {
    const user = userEvent.setup();

    // Capture mutate options so we can call onSuccess after the click
    let capturedOpts: any = null;
    mockUseRebuildIndex.mockReturnValue({
      mutate: (_vars: any, opts: any) => { capturedOpts = opts; },
      isPending: false,
    } as any);

    render(<RebuildIndexButton />);

    // Enter confirmation
    await user.click(screen.getByRole("button", { name: /rebuild index/i }));
    // Click confirm — this calls mutate which captures opts but doesn't fire callbacks
    await user.click(screen.getByRole("button", { name: /confirm rebuild\?/i }));

    expect(capturedOpts).not.toBeNull();
    expect(capturedOpts).toHaveProperty("onSuccess");
    expect(capturedOpts).toHaveProperty("onError");

    // Now simulate the mutation succeeding
    await act(() => {
      capturedOpts.onSuccess({ ok: true, count: 99, elapsedMs: 250 });
    });

    expect(toast.success).toHaveBeenCalledWith(
      "Index rebuilt: 99 keys re-indexed in 250ms",
    );
    // After success, button resets to initial state
    expect(screen.getByRole("button", { name: /rebuild index/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /cancel/i })).not.toBeInTheDocument();
  });

  it("shows error toast and resets confirmation on error", async () => {
    const user = userEvent.setup();

    let capturedOpts: any = null;
    mockUseRebuildIndex.mockReturnValue({
      mutate: (_vars: any, opts: any) => { capturedOpts = opts; },
      isPending: false,
    } as any);

    render(<RebuildIndexButton />);

    await user.click(screen.getByRole("button", { name: /rebuild index/i }));
    await user.click(screen.getByRole("button", { name: /confirm rebuild\?/i }));

    expect(capturedOpts).not.toBeNull();
    await act(() => {
      capturedOpts.onError(new Error("Upstream timeout"));
    });

    expect(toast.error).toHaveBeenCalledWith("Upstream timeout");
    // After error, button resets to initial state
    expect(screen.getByRole("button", { name: /rebuild index/i })).toBeInTheDocument();
  });

  it("disables button while pending", () => {
    mockUseRebuildIndex.mockReturnValue({
      mutate: mockMutate,
      isPending: true,
    } as any);

    render(<RebuildIndexButton />);

    const button = screen.getByRole("button", { name: /rebuilding/i });
    expect(button).toBeDisabled();
  });
});
