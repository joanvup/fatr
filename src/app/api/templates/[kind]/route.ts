import { HttpError, requireApiPermission } from "@/lib/dal";
import { apiError } from "@/lib/api";
import { IMPORT_KINDS, safeFilename, workbookResponse, type ImportKind } from "@/lib/excel/common";
import { buildTemplateWorkbook, TEMPLATE_TITLES } from "@/lib/excel/templates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    await requireApiPermission("data.import");
    const { kind } = await params;
    if (!(IMPORT_KINDS as readonly string[]).includes(kind)) {
      throw new HttpError(404, "Plantilla no encontrada.");
    }
    const workbook = buildTemplateWorkbook(kind as ImportKind);
    return await workbookResponse(workbook, `plantilla-${safeFilename(TEMPLATE_TITLES[kind as ImportKind])}.xlsx`);
  } catch (error) {
    return apiError(error);
  }
}
