export interface CSVResult {
  documents: Record<string, string[]>;
  errors: string[];
  warnings: {
    ignoredColumns: string[];
    mergedColumns: string[];
    removedDuplicates: string[];
  };
}

export function parseCSV(csv: string): CSVResult {
  const errors: string[] = [];
  const warnings: CSVResult["warnings"] = {
    ignoredColumns: [],
    mergedColumns: [],
    removedDuplicates: [],
  };
  const documents: Record<string, string[]> = {};

  const lines = csv.split("\n").map((l) => l.trim()).filter((l) => l.length > 0);

  if (lines.length < 2) {
    errors.push("CSV must have at least a header row and one data row");
    return { documents, errors, warnings };
  }

  // Parse header (column IDs)
  const headers = lines[0].split(",").map((h) => h.trim());
  const columnIds: (string | null)[] = [];
  const seenIds = new Set<string>();

  headers.forEach((header, i) => {
    if (!header) {
      columnIds.push(null);
      warnings.ignoredColumns.push(`#${i + 1}`);
    } else {
      if (seenIds.has(header)) {
        warnings.mergedColumns.push(`${header} (#${i + 1})`);
      }
      seenIds.add(header);
      columnIds.push(header);
      if (!documents[header]) {
        documents[header] = [];
      }
    }
  });

  // Parse data rows
  for (let row = 1; row < lines.length; row++) {
    const cells = lines[row].split(",").map((c) => c.trim());
    cells.forEach((cell, col) => {
      if (!cell) return;
      const docId = columnIds[col];
      if (!docId) return;

      if (documents[docId].includes(cell)) {
        warnings.removedDuplicates.push(`"${cell}" from ${docId} (#${col + 1})`);
      } else {
        documents[docId].push(cell);
      }
    });
  }

  return { documents, errors, warnings };
}
