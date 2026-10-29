"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { HttpError, assertCourseAccess, requirePermission } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { observationSaveSchema, cycleSchema } from "@/lib/validation";
import { errorResult, zodResult, type ActionResult } from "@/lib/action-result";

export async function createCycleAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("observations.write");
    const parsed = cycleSchema.safeParse({
      courseId: formData.get("courseId"),
      year: formData.get("year"),
      period: formData.get("period"),
      label: formData.get("label"),
      dateFrom: formData.get("dateFrom"),
      dateTo: formData.get("dateTo"),
    });
    if (!parsed.success) return zodResult(parsed.error);
    await assertCourseAccess(user, parsed.data.courseId);

    const cycle = await prisma.$transaction(async (tx) => {
      const created = await tx.observationCycle.create({
        data: { ...parsed.data, createdById: user.id },
      });
      const students = await tx.student.findMany({
        where: { courseId: parsed.data.courseId, active: true },
        select: { id: true },
      });
      if (students.length > 0) {
        await tx.observation.createMany({
          data: students.map((student) => ({
            cycleId: created.id,
            studentId: student.id,
            updatedById: user.id,
          })),
        });
      }
      return created;
    });

    revalidatePath("/observations");
    return { ok: true, id: cycle.id, message: "Ciclo creado." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "Ya existe un ciclo para ese curso, año y periodo." };
    }
    return errorResult(error);
  }
}

export async function saveObservationGridAction(input: unknown): Promise<ActionResult> {
  try {
    const user = await requirePermission("observations.write");
    const parsed = observationSaveSchema.safeParse(input);
    if (!parsed.success) return zodResult(parsed.error);

    const { cycleId, rows } = parsed.data;
    const cycle = await prisma.observationCycle.findUnique({
      where: { id: cycleId },
      select: { id: true, courseId: true, status: true },
    });
    if (!cycle) throw new HttpError(404, "Ciclo no encontrado.");
    await assertCourseAccess(user, cycle.courseId);
    if (cycle.status === "FINAL") {
      throw new HttpError(409, "El ciclo está finalizado. Solicita su reapertura a coordinación o administración.");
    }

    const [students, domains] = await Promise.all([
      prisma.student.findMany({
        where: { courseId: cycle.courseId, id: { in: rows.map((row) => row.studentId) } },
        select: { id: true },
      }),
      prisma.domain.findMany({ select: { id: true } }),
    ]);
    const allowedStudents = new Set(students.map((student) => student.id));
    const allowedDomains = new Set(domains.map((domain) => domain.id));
    const isTeacher = !can(user.role, "students.viewDiagnosis");

    await prisma.$transaction(async (tx) => {
      for (const row of rows) {
        if (!allowedStudents.has(row.studentId)) continue;

        const existing = await tx.observation.findUnique({
          where: { cycleId_studentId: { cycleId, studentId: row.studentId } },
          select: { id: true, diagnosisNote: true },
        });

        const observation = await tx.observation.upsert({
          where: { cycleId_studentId: { cycleId, studentId: row.studentId } },
          update: {
            observationDate: row.observationDate ?? null,
            parentMeetingDate: row.parentMeetingDate ?? null,
            parentAttended: row.parentAttended,
            studentMeetingDate: row.studentMeetingDate ?? null,
            diagnosisNote: isTeacher ? (existing?.diagnosisNote ?? null) : (row.diagnosisNote ?? null),
            nextFollowUpDate: row.nextFollowUpDate ?? null,
            updatedById: user.id,
          },
          create: {
            cycleId,
            studentId: row.studentId,
            observationDate: row.observationDate ?? null,
            parentMeetingDate: row.parentMeetingDate ?? null,
            parentAttended: row.parentAttended,
            studentMeetingDate: row.studentMeetingDate ?? null,
            diagnosisNote: isTeacher ? null : (row.diagnosisNote ?? null),
            nextFollowUpDate: row.nextFollowUpDate ?? null,
            updatedById: user.id,
          },
        });

        for (const score of row.scores) {
          if (!allowedDomains.has(score.domainId)) continue;
          await tx.observationScore.upsert({
            where: {
              observationId_domainId: { observationId: observation.id, domainId: score.domainId },
            },
            update: { level: score.level, note: score.note ?? null },
            create: {
              observationId: observation.id,
              domainId: score.domainId,
              level: score.level,
              note: score.note ?? null,
            },
          });
        }
      }
    });

    revalidatePath(`/observations/${cycleId}`);
    revalidatePath("/observations");
    revalidatePath("/");
    return { ok: true, message: "Observaciones guardadas." };
  } catch (error) {
    return errorResult(error);
  }
}

export async function setCycleStatusAction(formData: FormData): Promise<void> {
  const user = await requirePermission("observations.finalize");
  const cycleId = String(formData.get("cycleId") ?? "");
  const status = formData.get("status") === "FINAL" ? "FINAL" : "DRAFT";
  const cycle = await prisma.observationCycle.findUnique({
    where: { id: cycleId },
    select: { courseId: true },
  });
  if (!cycle) throw new HttpError(404, "Ciclo no encontrado.");
  await assertCourseAccess(user, cycle.courseId);
  await prisma.observationCycle.update({ where: { id: cycleId }, data: { status } });
  revalidatePath(`/observations/${cycleId}`);
  revalidatePath("/observations");
}
