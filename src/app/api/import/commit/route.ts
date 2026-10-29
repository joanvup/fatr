import { z } from "zod";
import { requireApiPermission } from "@/lib/dal";
import { apiError, assertSameOrigin, readJson } from "@/lib/api";
import { commitImportBatch } from "@/lib/excel/commit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ batchId: z.string().min(1, "Lote no válido.") });

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiPermission("data.import");
    const { batchId } = bodySchema.parse(await readJson(request));
    const result = await commitImportBatch(batchId, user);
    return Response.json(result);
  } catch (error) {
    return apiError(error);
  }
}
