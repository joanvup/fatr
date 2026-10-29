import { HttpError, requireApiPermission } from "@/lib/dal";
import { apiError, assertSameOrigin } from "@/lib/api";
import { prisma } from "@/lib/db";
import { IMPORT_KINDS, MAX_IMPORT_ROWS, type ImportKind } from "@/lib/excel/common";
import { parseWorkbook, type ImportError } from "@/lib/excel/parser";
import { validateImportReferences } from "@/lib/excel/references";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

function mergeErrors(first: ImportError[], second: ImportError[]): ImportError[] {
  const byRow = new Map<number, ImportError>();
  for (const error of [...first, ...second]) {
    const current = byRow.get(error.rowNumber);
    if (current) current.messages.push(...error.messages);
    else byRow.set(error.rowNumber, { rowNumber: error.rowNumber, messages: [...error.messages] });
  }
  return [...byRow.values()].sort((a, b) => a.rowNumber - b.rowNumber);
}

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiPermission("data.import");

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      throw new HttpError(400, "No se pudo leer el archivo enviado.");
    }

    const kind = String(form.get("kind") ?? "");
    if (!(IMPORT_KINDS as readonly string[]).includes(kind)) {
      throw new HttpError(400, "Selecciona un tipo de importación válido.");
    }
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      throw new HttpError(400, "Adjunta un archivo Excel (.xlsx).");
    }
    if (!/\.xlsx$/i.test(file.name)) {
      throw new HttpError(400, "El archivo debe tener extensión .xlsx.");
    }
    if (file.size > MAX_FILE_BYTES) {
      throw new HttpError(400, "El archivo supera el límite de 10 MB.");
    }

    let parsed;
    try {
      parsed = await parseWorkbook(await file.arrayBuffer(), kind as ImportKind);
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo leer el archivo.";
      throw new HttpError(400, message);
    }

    if (parsed.total === 0) {
      throw new HttpError(400, "El archivo no contiene filas con datos.");
    }
    if (parsed.total > MAX_IMPORT_ROWS) {
      throw new HttpError(400, `El archivo supera el límite de ${MAX_IMPORT_ROWS} filas.`);
    }

    const referenceErrors = await validateImportReferences(kind as ImportKind, parsed.rows);
    const errors = mergeErrors(parsed.errors, referenceErrors);

    const batch = await prisma.importBatch.create({
      data: {
        kind,
        filename: file.name,
        rowsJson: JSON.stringify({ rows: parsed.rows, errors }),
        rowCount: parsed.total,
        status: "PREVIEW",
        createdById: user.id,
      },
      select: { id: true },
    });

    return Response.json({
      batchId: batch.id,
      kind,
      filename: file.name,
      total: parsed.total,
      valid: parsed.rows.length,
      invalid: parsed.total - parsed.rows.length,
      errors,
      preview: parsed.rows.slice(0, 20),
    });
  } catch (error) {
    return apiError(error);
  }
}
