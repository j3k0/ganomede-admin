// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BanBadge, PasswordResetButton } from "../../../src/client/pages/users/UserProfile.js";

vi.mock("../../../src/client/lib/queries/users.js", async (importOriginal) => ({
  ...(await importOriginal<object>()),
  usePasswordReset: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
}));

import { usePasswordReset } from "../../../src/client/lib/queries/users.js";
import { toast } from "sonner";

type ResetData = { ok: boolean; deleted?: "unknown" };
const mockMutate = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(usePasswordReset).mockReturnValue({ mutate: mockMutate, isPending: false } as never);
});

/** Open the form, submit, and resolve the mutation with the server's body. */
async function resetWith(deleted: boolean | "unknown", data: ResetData) {
  mockMutate.mockImplementation((_vars, opts: { onSuccess: (d: ResetData) => void }) => opts.onSuccess(data));
  const user = userEvent.setup();
  render(<PasswordResetButton userId="alice" deleted={deleted} banned={false} />);
  await user.click(screen.getByRole("button", { name: /reset password/i }));
  await user.click(screen.getByRole("button", { name: /^set password$|reset password anyway/i }));
}

describe("PasswordResetButton", () => {
  it("is disabled on a deleted account", () => {
    render(<PasswordResetButton userId="alice" deleted={true} banned={false} />);
    expect(screen.getByRole("button", { name: /account deleted/i })).toBeDisabled();
  });

  it("says the deletion status is unknown, but stays usable", () => {
    render(<PasswordResetButton userId="alice" deleted="unknown" banned={false} />);
    expect(screen.getByRole("button", { name: /deletion status unknown/i })).toBeEnabled();
  });

  it("relabels the submit button when the status is unknown", async () => {
    const user = userEvent.setup();
    render(<PasswordResetButton userId="alice" deleted="unknown" banned={false} />);
    await user.click(screen.getByRole("button", { name: /reset password/i }));
    expect(screen.getByRole("button", { name: "Reset Password anyway (may have no effect)" })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /^set password$/i })).not.toBeInTheDocument();
  });

  it("warns instead of claiming success when the server reports unknown", async () => {
    await resetWith(false, { ok: true, deleted: "unknown" });
    expect(toast.warning).toHaveBeenCalledWith(
      expect.stringMatching(/Password reset for alice, but deletion status is unknown/),
      { duration: 10_000 },
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("trusts the server's fresh read over a stale unknown profile", async () => {
    await resetWith("unknown", { ok: true });
    expect(toast.success).toHaveBeenCalledWith("Password reset for alice");
    expect(toast.warning).not.toHaveBeenCalled();
  });
});

describe("BanBadge", () => {
  it("says 'In Good Standing' only on a known-live account", () => {
    const { rerender } = render(<BanBadge banned={false} deleted={false} />);
    expect(screen.getByText("In Good Standing")).toBeInTheDocument();
    rerender(<BanBadge banned={false} deleted="unknown" />);
    expect(screen.queryByText("In Good Standing")).not.toBeInTheDocument();
    rerender(<BanBadge banned={false} deleted={true} />);
    expect(screen.queryByText("In Good Standing")).not.toBeInTheDocument();
  });
});
