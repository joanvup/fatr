import ExcelJS from "exceljs";
import {
  assignmentImportRowSchema,
  attendanceImportRowSchema,
  studentImportRowSchema,
} from "@/lib/validation";
import { toIsoDate } from "@/lib/dates";
import type { ImportKind } from "@/lib/excel/common";

export type ImportError = { rowNumber: number; messages: string[] };
export type ImportRow = { rowNumber: number; data: Record<string, unknown> };
export type ParsedWorkbook = { total: number; rows: ImportRow[]; errors: ImportError[] };

const ALIASES: Record<ImportKind, Record<string, string[]>> = {
  students: {
    documentId: ["documento", "documento del estudiante", "numero de documento", "identificacion", "no de identificacion"],
    firstName: ["nombres", "nombre", "primer nombre"],
    lastName: ["apellidos", "apellido"],
    birthDate: ["fecha de nacimiento dd mm aaaa", "fecha de nacimiento", "nacimiento"],
    sex: ["sexo f m x", "sexo", "genero"],
    grade: ["grado", "grado escolar"],
    courseName: ["curso", "curso actual", "clase"],
    guardianName: ["acudiente", "nombre del acudiente", "representante"],
    guardianPhone: ["telefono del acudiente", "telefono", "celular"],
    guardianEmail: ["correo del acudiente", "correo", "email"],
    diagnosis: ["diagnostico opcional", "diagnostico", "diagnostico clinico"],
  },
  therapies: {
    documentId: ["documento del estudiante", "documento", "identificacion"],
    therapyName: ["terapia o area", "terapia", "area", "terapia asignada"],
    therapistEmail: ["correo del terapeuta opcional", "correo del terapeuta", "terapeuta", "correo"],
    startDate: ["fecha de inicio dd mm aaaa", "fecha de inicio", "inicio"],
  },
  attendance: {
    date: ["fecha dd mm aaaa", "fecha"],
    documentId: ["documento del estudiante", "documento", "identificacion"],
    therapyName: ["terapia o area", "terapia", "area"],
    startTime: ["hora de inicio hh mm", "hora de inicio", "hora inicio", "inicio"],
    endTime: ["hora de finalizacion hh mm", "hora de finalizacion", "hora fin", "fin"],
    professionalEmail: ["correo del profesional", "profesional", "correo"],
    notes: ["notas opcional", "notas", "observaciones"],
  },
};

const REQUIRED: Record<ImportKind, string[]> = {
  students: ["documentId", "firstName", "lastName", "grade"],
  therapies: ["documentId", "therapyName", "startDate"],
  attendance: ["date", "documentId", "therapyName", "startTime", "endTime", "professionalEmail"],
};

function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function fieldForHeader(kind: ImportKind, header: string) {
  const normalized = normalizeHeader(header);
  if (!normalized) return null;
  for (const [field, aliases] of Object.entries(ALIASES[kind])) {
    if (aliases.includes(normalized)) return field;
  }
  return null;
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const rich = value as { richText?: { text: string }[]; text?: unknown; result?: ExcelJS.CellValue };
    if (Array.isArray(rich.richText)) return rich.richText.map((part) => part.text).join("").trim();
    if (rich.text !== undefined) return String(rich.text).trim();
    if (rich.result !== undefined) return cellText(rich.result);
    return "";
  }
  return String(value).trim();
}

function dateToIso(value: ExcelJS.CellValue): string {
  if (value instanceof Date) {
    const hasTime = value.getUTCHours() !== 0 || value.getUTCMinutes() !== 0 || value.getUTCSeconds() !== 0;
    if (!hasTime) {
      const year = value.getUTCFullYear();
      const month = String(value.getUTCMonth() + 1).padStart(2, "0");
      const day = String(value.getUTCDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
    return toIsoDate(value);
  }
  const text = cellText(value);
  if (!text) return "";
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const dmy = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(text);
  if (dmy) {
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  }
  return text;
}

function timeToHHmm(value: ExcelJS.CellValue): string {
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    const hours = Math.floor(totalMinutes / 60) % 24;
    const minutes = totalMinutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  if (value instanceof Date) {
    const hours = value.getUTCHours() !== 0 ? value.getUTCHours() : value.getHours();
    const minutes = value.getUTCHours() !== 0 ? value.getUTCMinutes() : value.getMinutes();
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  }
  const text = cellText(value);
  if (!text) return "";
  const match = /^(\d{1,2}):(\d{2})/.exec(text);
  if (!match) return text;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function normalizeSex(value: ExcelJS.CellValue): string {
  const text = cellText(value).toUpperCase();
  if (!text) return "";
  if (text.startsWith("F") || text.includes("FEMENINO")) return "F";
  if (text.startsWith("M") || text.includes("MASCULINO")) return "M";
  if (text.startsWith("X") || text.includes("OTRO")) return "X";
  return text;
}

function schemaFor(kind: ImportKind) {
  if (kind === "students") return studentImportRowSchema;
  if (kind === "therapies") return assignmentImportRowSchema;
  return attendanceImportRowSchema;
}

function prepareRaw(kind: ImportKind, cells: Map<string, ExcelJS.CellValue>): Record<string, unknown> {
  const raw: Record<string, unknown> = {};
  for (const [field, value] of cells) {
    if (kind === "students") {
      if (field === "birthDate") raw[field] = dateToIso(value);
      else if (field === "sex") raw[field] = normalizeSex(value);
      else raw[field] = cellText(value);
    } else if (kind === "therapies") {
      if (field === "startDate") raw[field] = dateToIso(value);
      else if (field === "therapistEmail") raw[field] = cellText(value).toLowerCase();
      else raw[field] = cellText(value);
    } else {
      if (field === "date") raw[field] = dateToIso(value);
      else if (field === "startTime" || field === "endTime") raw[field] = timeToHHmm(value);
      else if (field === "professionalEmail") raw[field] = cellText(value).toLowerCase();
      else raw[field] = cellText(value);
    }
  }
  return raw;
}

export async function parseWorkbook(buffer: ArrayBuffer, kind: ImportKind): Promise<ParsedWorkbook> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const worksheet = workbook.worksheets.find((sheet) => sheet.name !== "_meta");
  if (!worksheet) throw new Error("El archivo no contiene una hoja de datos.");

  const fieldByColumn = new Map<number, string>();
  worksheet.getRow(1).eachCell({ includeEmpty: false }, (cell, columnNumber) => {
    const field = fieldForHeader(kind, cellText(cell.value));
    if (field) fieldByColumn.set(columnNumber, field);
  });

  const foundFields = new Set(fieldByColumn.values());
  if (foundFields.size === 0) {
    throw new Error("No se reconocen los encabezados. Descarga la plantilla oficial e inténtalo de nuevo.");
  }
  const missing = REQUIRED[kind].filter((field) => !foundFields.has(field));
  if (missing.length > 0) {
    throw new Error(`Faltan columnas obligatorias: ${missing.join(", ")}.`);
  }

  const schema = schemaFor(kind);
  const rows: ImportRow[] = [];
  const errors: ImportError[] = [];
  let total = 0;

  for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const cells = new Map<string, ExcelJS.CellValue>();
    let hasValue = false;

    for (const [columnNumber, field] of fieldByColumn) {
      const value = row.getCell(columnNumber).value;
      cells.set(field, value);
      if (cellText(value)) hasValue = true;
    }
    if (!hasValue) continue;
    total += 1;

    const raw = prepareRaw(kind, cells);
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      errors.push({
        rowNumber,
        messages: parsed.error.issues.map((issue) => `${issue.path.join(".") || "fila"}: ${issue.message}`),
      });
      continue;
    }
    rows.push({ rowNumber, data: parsed.data as Record<string, unknown> });
  }

  return { total, rows, errors };
}
