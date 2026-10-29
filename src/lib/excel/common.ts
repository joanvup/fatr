import ExcelJS from "exceljs";

export const EXCEL_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
export const MAX_IMPORT_ROWS = 1000;

export const IMPORT_KINDS = ["students", "therapies", "attendance"] as const;
export type ImportKind = (typeof IMPORT_KINDS)[number];

export const EXPORT_KINDS = ["students", "attendance", "attention", "observations", "followups"] as const;
export type ExportKind = (typeof EXPORT_KINDS)[number];

export type ColumnDef = {
  header: string;
  key: string;
  width: number;
  note?: string;
};

const BORDER = { style: "thin" as const, color: { argb: "FF9CA3AF" } };

export function addDataSheet(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: ColumnDef[],
  rows: Record<string, unknown>[],
) {
  const sheet = workbook.addWorksheet(name, {
    views: [{ state: "frozen", ySplit: 1 }],
    properties: { defaultRowHeight: 18 },
  });

  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
  }));

  const header = sheet.getRow(1);
  header.height = 30;
  header.eachCell((cell) => {
    cell.font = { bold: true, size: 10, color: { argb: "FF111827" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9D9D9" } };
    cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  });

  columns.forEach((column, index) => {
    if (column.note) header.getCell(index + 1).note = column.note;
  });

  if (rows.length > 0) {
    sheet.addRows(rows);
  }

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    row.eachCell({ includeEmpty: true }, (cell) => {
      cell.font = { size: 10 };
      cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
      cell.alignment = { vertical: "top", wrapText: true };
    });
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
}

export function addMetaSheet(workbook: ExcelJS.Workbook, kind: ImportKind, columns: ColumnDef[]) {
  const meta = workbook.addWorksheet("_meta");
  meta.addRow(["kind", kind]);
  meta.addRow(["version", 1]);
  meta.addRow(["createdAt", new Date().toISOString()]);
  meta.addRow([]);
  meta.addRow(["campo", "encabezado"]);
  for (const column of columns) {
    meta.addRow([column.key, column.header]);
  }
  meta.state = "veryHidden";
}

export async function workbookResponse(workbook: ExcelJS.Workbook, filename: string) {
  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer as ArrayBuffer), {
    headers: {
      "Content-Type": EXCEL_MIME,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function safeFilename(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
