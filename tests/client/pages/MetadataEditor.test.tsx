// @vitest-environment jsdom
import "../../client/setup.js";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetadataEditor } from "../../../src/client/pages/users/MetadataEditor.js";

vi.mock("../../../src/client/lib/queries/users.js", () => ({
  useUserMetadata: vi.fn(),
  useUpdateMetadata: vi.fn(),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { useUserMetadata, useUpdateMetadata } from "../../../src/client/lib/queries/users.js";

const mockUseUserMetadata = vi.mocked(useUserMetadata);
const mockUseUpdateMetadata = vi.mocked(useUpdateMetadata);

function renderWithMetadata(fields: Array<{ id: string; value: unknown }>) {
  mockUseUserMetadata.mockReturnValue(
    { data: fields, isLoading: false } as unknown as ReturnType<typeof useUserMetadata>,
  );
  return render(<MetadataEditor userId="alice" />);
}

describe("MetadataEditor — pushStatus rendering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseUpdateMetadata.mockReturnValue(
      { mutate: vi.fn() } as unknown as ReturnType<typeof useUpdateMetadata>,
    );
  });

  it("shows 'never asked' when pushStatus is null", () => {
    renderWithMetadata([{ id: "pushStatus", value: null }]);

    expect(screen.getByText("never asked")).toBeInTheDocument();
  });

  it("shows a red 'refused' badge with the push type", () => {
    renderWithMetadata([
      { id: "pushStatus", value: { type: "apn", permissions: "refused" } },
    ]);

    const badge = screen.getByText("refused");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-red-100");
    expect(screen.getByText("via APN")).toBeInTheDocument();
  });

  it("shows a green 'granted' badge", () => {
    renderWithMetadata([
      { id: "pushStatus", value: { type: "gcm", permissions: "granted" } },
    ]);

    const badge = screen.getByText("granted");
    expect(badge).toBeInTheDocument();
    expect(badge.className).toContain("bg-green-100");
    expect(screen.getByText("via GCM")).toBeInTheDocument();
  });

  it("shows a JSON string value the same as an object value", () => {
    // usermeta stores strings; the value may arrive as a JSON string
    renderWithMetadata([
      { id: "pushStatus", value: '{"type":"apn","permissions":"granted"}' },
    ]);

    expect(screen.getByText("granted")).toBeInTheDocument();
    expect(screen.getByText("via APN")).toBeInTheDocument();
  });

  it("falls back to raw display for a malformed value", () => {
    renderWithMetadata([{ id: "pushStatus", value: "not-json" }]);

    expect(screen.getByText("not-json")).toBeInTheDocument();
    expect(screen.queryByText("never asked")).not.toBeInTheDocument();
  });

  it("still renders other fields as plain values", () => {
    renderWithMetadata([{ id: "locale", value: "fr" }]);

    expect(screen.getByDisplayValue("fr")).toBeInTheDocument();
  });
});
