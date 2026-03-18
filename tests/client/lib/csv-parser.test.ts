import { describe, it, expect } from "vitest";
import { parseCSV } from "../../../src/client/lib/csv-parser.js";

describe("parseCSV", () => {
  it("parses simple CSV with header row", () => {
    const csv = "swords,shields\niron_sword,wooden_shield\nsteel_sword,iron_shield";
    const result = parseCSV(csv);
    expect(result.errors).toEqual([]);
    expect(result.documents).toEqual({
      swords: ["iron_sword", "steel_sword"],
      shields: ["wooden_shield", "iron_shield"],
    });
  });

  it("ignores empty columns", () => {
    const csv = "swords,,shields\niron_sword,,wooden_shield";
    const result = parseCSV(csv);
    expect(Object.keys(result.documents)).toEqual(["swords", "shields"]);
    expect(result.warnings.ignoredColumns.length).toBeGreaterThan(0);
  });

  it("merges duplicate column IDs", () => {
    const csv = "swords,swords\niron_sword,steel_sword";
    const result = parseCSV(csv);
    expect(result.documents.swords).toEqual(["iron_sword", "steel_sword"]);
    expect(result.warnings.mergedColumns.length).toBeGreaterThan(0);
  });

  it("removes duplicate values within a document", () => {
    const csv = "swords\niron_sword\niron_sword\nsteel_sword";
    const result = parseCSV(csv);
    expect(result.documents.swords).toEqual(["iron_sword", "steel_sword"]);
    expect(result.warnings.removedDuplicates.length).toBeGreaterThan(0);
  });

  it("returns error for less than 2 lines", () => {
    const result = parseCSV("swords");
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("skips empty cells in value rows", () => {
    const csv = "swords,shields\niron_sword,\n,iron_shield";
    const result = parseCSV(csv);
    expect(result.documents.swords).toEqual(["iron_sword"]);
    expect(result.documents.shields).toEqual(["iron_shield"]);
  });
});
