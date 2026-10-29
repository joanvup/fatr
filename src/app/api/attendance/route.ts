import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, assertStudentAccess, requireApiPermission } from "@/lib/dal";
import { assertSameOrigin, apiError, readJson } from "@/lib/api";
import { attendanceSchema } from "@/lib/validation";
import { decodeSignature } from "@/lib/signatures";
import { minutesBetween } from "@/lib/dates";
import { getSettings, requiresSignature } from "@/lib/settings";

export const runtime = "nodejs";

const PROFESSIONAL_ROLES = new Set(["ADMIN", "COORDINATOR", "THERAPIST"]);

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const user = await requireApiPermission("attendance.write");
    const payload = attendanceSchema.parse(await readJson(request));
    await assertStudentAccess(user, payload.studentId);

    const [student, therapy, professional, settings] = await Promise.all([
      prisma.student.findUnique({
        where: { id: payload.studentId },
        select: { id: true, active: true, guardianName: true },
      }),
      prisma.therapy.findUnique({ where: { id: payload.therapyId }, select: { id: true, active: true } }),
      prisma.user.findUnique({
        where: { id: payload.professionalId },
        select: { id: true, name: true, role: true, active: true },
      }),
      getSettings(),
    ]);

    if (!student || !student.active) throw new HttpError(404, "Estudiante no encontrado o inactivo.");
    if (!therapy || !therapy.active) throw new HttpError(400, "La terapia o área seleccionada no está disponible.");
    if (!professional || !professional.active || !PROFESSIONAL_ROLES.has(professional.role)) {
      throw new HttpError(400, "El profesional seleccionado no es válido.");
    }

    const professionalSignature = decodeSignature(payload.professionalSignature, "del profesional");
    const guardianSignature = decodeSignature(payload.guardianSignature, "del acudiente");

    if (requiresSignature(settings) && !professionalSignature) {
      throw new HttpError(400, "La firma del profesional es obligatoria según la configuración institucional.");
    }

    const durationMinutes = minutesBetween(payload.startTime, payload.endTime);

    const attendance = await prisma.$transaction(async (tx) => {
      const created = await tx.attendance.create({
        data: {
          studentId: student.id,
          therapyId: therapy.id,
          date: payload.date,
          durationMinutes,
          startTime: payload.startTime,
          endTime: payload.endTime,
          professionalId: professional.id,
          professionalName: professional.name,
          notes: payload.notes ?? null,
          createdById: user.id,
        },
      });

      if (professionalSignature) {
        await tx.signature.create({
          data: {
            attendanceId: created.id,
            role: "PROFESSIONAL",
            data: professionalSignature,
            mimeType: "image/png",
            signerName: professional.name,
          },
        });
      }

      if (guardianSignature) {
        await tx.signature.create({
          data: {
            attendanceId: created.id,
            role: "GUARDIAN",
            data: guardianSignature,
            mimeType: "image/png",
            signerName: payload.signerGuardianName ?? student.guardianName ?? null,
          },
        });
      }

      return created;
    });

    revalidatePath("/attendance");
    revalidatePath("/attention");
    revalidatePath(`/students/${student.id}`);
    revalidatePath("/");

    return NextResponse.json({ id: attendance.id, durationMinutes }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe una sesión para ese estudiante, terapia, fecha y hora inicial." },
        { status: 409 },
      );
    }
    return apiError(error);
  }
}
