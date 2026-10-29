"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { HttpError, assertStudentAccess, requirePermission } from "@/lib/dal";
import { followUpSchema } from "@/lib/validation";
import { errorResult, zodResult, type ActionResult } from "@/lib/action-result";

function parseFollowUp(formData: FormData) {
  return followUpSchema.safeParse({
    studentId: formData.get("studentId"),
    cycleLabel: formData.get("cycleLabel"),
    startDate: formData.get("startDate"),
    followUpDate: formData.get("followUpDate"),
    realizationDate: formData.get("realizationDate"),
    descriptionInitial: formData.get("descriptionInitial"),
    strategies: formData.get("strategies"),
    achievements: formData.get("achievements"),
    followUpNotes: formData.get("followUpNotes"),
    responsibleName: formData.get("responsibleName"),
    workArea: formData.get("workArea"),
    counselorName: formData.get("counselorName"),
    status: formData.get("status") || "DRAFT",
  });
}

export async function createFollowUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("followUps.write");
    const parsed = parseFollowUp(formData);
    if (!parsed.success) return zodResult(parsed.error);
    const data = parsed.data;
    await assertStudentAccess(user, data.studentId);

    const student = await prisma.student.findUnique({
      where: { id: data.studentId },
      select: { diagnosis: true },
    });
    if (!student) throw new HttpError(404, "Estudiante no encontrado.");

    const followUp = await prisma.followUp.create({
      data: {
        studentId: data.studentId,
        cycleLabel: data.cycleLabel ?? null,
        startDate: data.startDate,
        followUpDate: data.followUpDate,
        realizationDate: data.realizationDate,
        diagnosisSnapshot: student.diagnosis ?? null,
        descriptionInitial: data.descriptionInitial ?? null,
        strategies: data.strategies ?? null,
        achievements: data.achievements ?? null,
        followUpNotes: data.followUpNotes ?? null,
        responsibleId: user.id,
        responsibleName: data.responsibleName,
        workArea: data.workArea ?? null,
        counselorName: data.counselorName ?? null,
        status: data.status ?? "DRAFT",
        createdById: user.id,
      },
    });

    revalidatePath("/follow-ups");
    revalidatePath(`/students/${data.studentId}`);
    revalidatePath("/");
    return { ok: true, id: followUp.id, message: "Seguimiento guardado." };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateFollowUpAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("followUps.write");
    const id = String(formData.get("id") ?? "");
    const existing = await prisma.followUp.findUnique({
      where: { id },
      select: { studentId: true },
    });
    if (!existing) throw new HttpError(404, "Seguimiento no encontrado.");
    await assertStudentAccess(user, existing.studentId);

    const parsed = parseFollowUp(formData);
    if (!parsed.success) return zodResult(parsed.error);
    const data = parsed.data;
    if (data.studentId !== existing.studentId) {
      throw new HttpError(409, "No puedes cambiar el estudiante de un seguimiento existente.");
    }

    await prisma.followUp.update({
      where: { id },
      data: {
        cycleLabel: data.cycleLabel ?? null,
        startDate: data.startDate,
        followUpDate: data.followUpDate,
        realizationDate: data.realizationDate,
        // El diagnóstico es un snapshot del documento: se conserva el original.
        descriptionInitial: data.descriptionInitial ?? null,
        strategies: data.strategies ?? null,
        achievements: data.achievements ?? null,
        followUpNotes: data.followUpNotes ?? null,
        responsibleName: data.responsibleName,
        workArea: data.workArea ?? null,
        counselorName: data.counselorName ?? null,
        status: data.status ?? "DRAFT",
      },
    });

    revalidatePath("/follow-ups");
    revalidatePath(`/follow-ups/${id}`);
    revalidatePath(`/students/${existing.studentId}`);
    return { ok: true, id, message: "Cambios guardados." };
  } catch (error) {
    return errorResult(error);
  }
}

export async function setFollowUpStatusAction(formData: FormData): Promise<void> {
  const user = await requirePermission("followUps.write");
  const id = String(formData.get("id") ?? "");
  const status = formData.get("status") === "FINAL" ? "FINAL" : "DRAFT";
  const followUp = await prisma.followUp.findUnique({
    where: { id },
    select: { studentId: true },
  });
  if (!followUp) throw new HttpError(404, "Seguimiento no encontrado.");
  await assertStudentAccess(user, followUp.studentId);
  await prisma.followUp.update({ where: { id }, data: { status } });
  revalidatePath("/follow-ups");
  revalidatePath(`/follow-ups/${id}`);
  revalidatePath(`/students/${followUp.studentId}`);
  revalidatePath("/");
}
