"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  assertCourseAccess,
  assertStudentAccess,
  requirePermission,
  requireUser,
} from "@/lib/dal";
import { studentSchema, studentTherapySchema } from "@/lib/validation";
import { errorResult, type ActionResult } from "@/lib/action-result";
import { todayIso } from "@/lib/dates";

function parseStudent(formData: FormData) {
  return studentSchema.safeParse({
    documentId: formData.get("documentId"),
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    birthDate: formData.get("birthDate"),
    sex: formData.get("sex"),
    grade: formData.get("grade"),
    courseId: formData.get("courseId"),
    guardianName: formData.get("guardianName"),
    guardianPhone: formData.get("guardianPhone"),
    guardianEmail: formData.get("guardianEmail"),
    diagnosis: formData.get("diagnosis"),
    active: formData.get("active") === "on",
  });
}

export async function createStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("students.write");
    const parsed = parseStudent(formData);
    if (!parsed.success) {
      return {
        message: "Revisa los campos marcados.",
        fieldErrors: Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
        ),
      };
    }
    const data = parsed.data;
    await assertCourseAccess(user, data.courseId);

    const student = await prisma.student.create({
      data: {
        documentId: data.documentId,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate,
        sex: data.sex,
        grade: data.grade,
        courseId: data.courseId ?? null,
        guardianName: data.guardianName,
        guardianPhone: data.guardianPhone,
        guardianEmail: data.guardianEmail,
        diagnosis: data.diagnosis,
        diagnosisUpdatedAt: data.diagnosis ? new Date() : null,
        active: data.active,
      },
    });

    revalidatePath("/students");
    return { ok: true, id: student.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "Ya existe un estudiante con ese documento.", fieldErrors: { documentId: "Documento ya registrado." } };
    }
    return errorResult(error);
  }
}

export async function updateStudentAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("students.write");
    const id = String(formData.get("id") ?? "");
    await assertStudentAccess(user, id);

    const parsed = parseStudent(formData);
    if (!parsed.success) {
      return {
        message: "Revisa los campos marcados.",
        fieldErrors: Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join("."), issue.message]),
        ),
      };
    }
    const data = parsed.data;
    await assertCourseAccess(user, data.courseId);

    const current = await prisma.student.findUnique({ where: { id }, select: { diagnosis: true } });
    const diagnosisChanged = (current?.diagnosis ?? "") !== (data.diagnosis ?? "");

    await prisma.student.update({
      where: { id },
      data: {
        documentId: data.documentId,
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate ?? null,
        sex: data.sex,
        grade: data.grade,
        courseId: data.courseId ?? null,
        guardianName: data.guardianName ?? null,
        guardianPhone: data.guardianPhone ?? null,
        guardianEmail: data.guardianEmail ?? null,
        diagnosis: data.diagnosis ?? null,
        diagnosisUpdatedAt: diagnosisChanged && data.diagnosis ? new Date() : undefined,
        active: data.active,
      },
    });

    revalidatePath("/students");
    revalidatePath(`/students/${id}`);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "Ya existe un estudiante con ese documento.", fieldErrors: { documentId: "Documento ya registrado." } };
    }
    return errorResult(error);
  }
}

export async function setStudentActiveAction(formData: FormData): Promise<void> {
  const user = await requirePermission("students.write");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  await assertStudentAccess(user, id);
  await prisma.student.update({ where: { id }, data: { active } });
  revalidatePath("/students");
  revalidatePath(`/students/${id}`);
}

export async function assignTherapyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("students.write");
    const parsed = studentTherapySchema.safeParse({
      studentId: formData.get("studentId"),
      therapyId: formData.get("therapyId"),
      therapistId: formData.get("therapistId"),
      startDate: formData.get("startDate") || todayIso(),
      notes: formData.get("notes"),
    });
    if (!parsed.success) {
      return {
        message: "Revisa los datos de la asignación.",
        fieldErrors: Object.fromEntries(parsed.error.issues.map((issue) => [issue.path.join("."), issue.message])),
      };
    }
    const { studentId, therapyId, therapistId, startDate } = parsed.data;
    await assertStudentAccess(user, studentId);

    const existing = await prisma.studentTherapy.findUnique({
      where: { studentId_therapyId: { studentId, therapyId } },
    });

    if (existing) {
      await prisma.studentTherapy.update({
        where: { id: existing.id },
        data: { active: true, therapistId: therapistId ?? null, startDate, endDate: null },
      });
    } else {
      await prisma.studentTherapy.create({
        data: { studentId, therapyId, therapistId: therapistId ?? null, startDate },
      });
    }

    revalidatePath(`/students/${studentId}`);
    return { ok: true, message: "Terapia asignada." };
  } catch (error) {
    return errorResult(error);
  }
}

export async function removeTherapyAction(formData: FormData): Promise<void> {
  const user = await requirePermission("students.write");
  const id = String(formData.get("id") ?? "");
  const assignment = await prisma.studentTherapy.findUnique({ where: { id }, select: { studentId: true } });
  if (!assignment) return;
  await assertStudentAccess(user, assignment.studentId);
  await prisma.studentTherapy.update({
    where: { id },
    data: { active: false, endDate: todayIso() },
  });
  revalidatePath(`/students/${assignment.studentId}`);
}

export async function updateOwnProfileAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const name = String(formData.get("name") ?? "").trim();
    if (name.length < 2) return { message: "Ingresa tu nombre." };
    await prisma.user.update({ where: { id: user.id }, data: { name } });
    revalidatePath("/profile");
    return { ok: true, message: "Datos actualizados." };
  } catch (error) {
    return errorResult(error);
  }
}
