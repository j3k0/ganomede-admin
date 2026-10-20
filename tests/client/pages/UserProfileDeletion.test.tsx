// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { UserProfile } from "../../../src/client/pages/users/UserProfile.js";
import type { DeletedStatus, UserProfile as Profile } from "../../../src/client/lib/queries/users.js";

const mutation = { mutate: vi.fn(), isPending: false };
vi.mock("../../../src/client/lib/queries/users.js", () => ({
  useUserProfile: vi.fn(),
  useAwardCurrency: () => mutation,
  useBan: () => mutation,
  useUnban: () => mutation,
  usePasswordReset: () => mutation,
}));
// Sections with their own queries are irrelevant to the header and banners.
vi.mock("../../../src/client/pages/users/Transactions.js", () => ({ Transactions: () => null }));
vi.mock("../../../src/client/pages/users/ReportsBlocks.js", () => ({ ReportsBlocks: () => null }));
vi.mock("../../../src/client/pages/users/MetadataEditor.js", () => ({ MetadataEditor: () => null }));
vi.mock("../../../src/client/pages/users/EmailDialog.js", () => ({ EmailDialog: () => null }));
vi.mock("../../../src/client/pages/users/Games.js", () => ({ Games: () => null }));
vi.mock("../../../src/client/pages/users/Ranking.js", () => ({ Ranking: () => null }));

import { useUserProfile } from "../../../src/client/lib/queries/users.js";

function renderProfile(deleted: DeletedStatus, warnings: string[]) {
  const profile: Profile = {
    userId: "alice", balance: [], transactions: [], banInfo: { exists: false }, avatar: null,
    metadata: {}, directory: null, deleted, _warnings: warnings, _transactionsHasMore: false,
  };
  vi.mocked(useUserProfile).mockReturnValue({ data: profile, isLoading: false, error: null } as never);
  render(
    <MemoryRouter initialEntries={["/users/alice"]}>
      <Routes><Route path="/users/:username" element={<UserProfile />} /></Routes>
    </MemoryRouter>,
  );
}

describe("UserProfile deletion status", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows its own banner and badge on unknown, and keeps it out of 'Could not load'", () => {
    renderProfile("unknown", ["deleted", "avatar"]);
    expect(screen.getByText("Deletion status unknown.")).toBeInTheDocument();
    expect(screen.getByText("Deletion status unknown")).toBeInTheDocument();
    expect(screen.getByText(/Could not load: Avatar\./)).toBeInTheDocument();
    expect(screen.queryByText(/Could not load:.*Deletion/)).not.toBeInTheDocument();
    expect(screen.queryByText("In Good Standing")).not.toBeInTheDocument();
  });

  it("shows no 'Could not load' banner when the deletion status is the only warning", () => {
    renderProfile("unknown", ["deleted"]);
    expect(screen.queryByText(/Some data may be incomplete/)).not.toBeInTheDocument();
  });

  it("shows neither deletion warning on a known-live account", () => {
    renderProfile(false, []);
    expect(screen.queryByText(/Deletion status unknown/)).not.toBeInTheDocument();
    expect(screen.getByText("In Good Standing")).toBeInTheDocument();
  });
});
