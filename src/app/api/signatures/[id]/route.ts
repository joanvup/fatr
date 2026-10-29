import { prisma } from "@/lib/db";
import { HttpError, assertCourseAccess, requireApiPermission } from "@/lib/dal";
import { apiError } from "@/lib/api";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireApiPermission("attendance.read");
    const { id } = await params;

    const signature = await prisma.signature.findUnique({
      where: { id },
      select: {
        data: true,
        mimeType: true,
        attendance: { select: { student: { select: { courseId: true } } } },
      },
    });
    if (!signature) throw new HttpError(404, "Firma no encontrada.");
    await assertCourseAccess(user, signature.attendance.student.courseId);

    return new Response(new Uint8Array(signature.data), {
      headers: {
        "Content-Type": signature.mimeType,
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    return apiError(error);
  }
}
