import "server-only";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { HttpError, type SessionUser } from "@/lib/dal";
import { minutesBetween } from "@/lib/dates";
import {
  assignmentImportRowSchema,
  attendanceImportRowSchema,
  studentImportRowSchema,
} from "@/lib/validation";
import type { ImportKind } from "@/lib/excel/common";
import type { ImportError, ImportRow } from "@/lib/excel/parser";
import { validateImportReferences } from "@/lib/excel/references";

type StoredBatch = { rows: ImportRow[]; errors: ImportError[] };

export type ImportCommitResult = {
  kind: ImportKind;
  processed: number;
  created: number;
  updated: number;
};

function key(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function commitStudents(rows: ImportRow[]): Promise<ImportCommitResult> {
  const courses = await prisma.course.findMany({
    where: { active: true },
    select: { id: true, name: true, year: true },
    orderBy: { year: "desc" },
  });
  const courseMap = new Map<string, string>();
  for (const course of courses) {
    const courseKey = key(course.name);
    if (!courseMap.has(courseKey)) courseMap.set(courseKey, course.id);
  }

  const documents = rows.map((row) => text(row.data.documentId));
  const existing = await prisma.student.findMany({
    where: { documentId: { in: documents } },
    select: { id: true, documentId: true, sex: true, birthDate: true, courseId: true, guardianName: true, guardianPhone: true, guardianEmail: true, diagnosis: true },
  });
  const existingByDocument = new Map(existing.map((student) => [student.documentId, student]));

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const parsed = studentImportRowSchema.safeParse(row.data);
      if (!parsed.success) throw new HttpError(400, `Fila ${row.rowNumber}: datos inválidos.`);
      const data = parsed.data;
      const current = existingByDocument.get(data.documentId);
      const courseId = data.courseName ? (courseMap.get(key(data.courseName)) ?? null) : (current?.courseId ?? null);
      const payload = {
        firstName: data.firstName,
        lastName: data.lastName,
        birthDate: data.birthDate !== undefined ? data.birthDate : (current?.birthDate ?? null),
        sex: data.sex ?? current?.sex ?? "X",
        grade: data.grade,
        courseId,
        guardianName: data.guardianName !== undefined ? data.guardianName : (current?.guardianName ?? null),
        guardianPhone: data.guardianPhone !== undefined ? data.guardianPhone : (current?.guardianPhone ?? null),
        guardianEmail: data.guardianEmail !== undefined ? data.guardianEmail : (current?.guardianEmail ?? null),
        diagnosis: data.diagnosis !== undefined ? data.diagnosis : (current?.diagnosis ?? null),
        diagnosisUpdatedAt: data.diagnosis !== undefined ? new Date() : undefined,
      };

      if (current) {
        await tx.student.update({ where: { id: current.id }, data: payload });
        updated += 1;
      } else {
        await tx.student.create({
          data: { documentId: data.documentId, active: true, ...payload },
        });
        created += 1;
      }
    }
  });

  return { kind: "students", processed: rows.length, created, updated };
}

async function commitTherapies(rows: ImportRow[]): Promise<ImportCommitResult> {
  const documents = [...new Set(rows.map((row) => text(row.data.documentId)))];
  const students = await prisma.student.findMany({
    where: { documentId: { in: documents } },
    select: { id: true, documentId: true },
  });
  const studentByDocument = new Map(students.map((student) => [student.documentId, student.id]));

  const therapies = await prisma.therapy.findMany({ where: { active: true }, select: { id: true, key: true, nameEs: true } });
  const therapyMap = new Map<string, string>();
  for (const therapy of therapies) {
    therapyMap.set(key(therapy.nameEs), therapy.id);
    therapyMap.set(key(therapy.key), therapy.id);
  }

  const emails = [...new Set(rows.map((row) => text(row.data.therapistEmail).toLowerCase()).filter(Boolean))];
  const users = emails.length
    ? await prisma.user.findMany({ where: { email: { in: emails }, active: true }, select: { id: true, email: true } })
    : [];
  const userByEmail = new Map(users.map((entry) => [entry.email.toLowerCase(), entry.id]));

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const parsed = assignmentImportRowSchema.safeParse(row.data);
      if (!parsed.success) throw new HttpError(400, `Fila ${row.rowNumber}: datos inválidos.`);
      const data = parsed.data;
      const studentId = studentByDocument.get(data.documentId);
      const therapyId = therapyMap.get(key(data.therapyName));
      if (!studentId || !therapyId) throw new HttpError(409, `Fila ${row.rowNumber}: estudiante o terapia no encontrada.`);
      const therapistId = data.therapistEmail ? (userByEmail.get(data.therapistEmail.toLowerCase()) ?? null) : null;
      const current = await tx.studentTherapy.findUnique({
        where: { studentId_therapyId: { studentId, therapyId } },
        select: { id: true },
      });
      const payload = { therapistId, startDate: data.startDate, active: true };
      await tx.studentTherapy.upsert({
        where: { studentId_therapyId: { studentId, therapyId } },
        update: payload,
        create: { studentId, therapyId, ...payload },
      });
      if (current) updated += 1;
      else created += 1;
    }
  });

  return { kind: "therapies", processed: rows.length, created, updated };
}

async function commitAttendance(rows: ImportRow[], user: SessionUser): Promise<ImportCommitResult> {
  const documents = [...new Set(rows.map((row) => text(row.data.documentId)))];
  const [students, therapies, users] = await Promise.all([
    prisma.student.findMany({ where: { documentId: { in: documents } }, select: { id: true, documentId: true } }),
    prisma.therapy.findMany({ where: { active: true }, select: { id: true, key: true, nameEs: true } }),
    prisma.user.findMany({ where: { active: true }, select: { id: true, email: true, name: true } }),
  ]);
  const studentByDocument = new Map(students.map((student) => [student.documentId, student.id]));
  const therapyMap = new Map<string, string>();
  for (const therapy of therapies) {
    therapyMap.set(key(therapy.nameEs), therapy.id);
    therapyMap.set(key(therapy.key), therapy.id);
  }
  const userByEmail = new Map(users.map((entry) => [entry.email.toLowerCase(), entry]));

  let created = 0;
  let updated = 0;

  await prisma.$transaction(async (tx) => {
    for (const row of rows) {
      const parsed = attendanceImportRowSchema.safeParse(row.data);
      if (!parsed.success) throw new HttpError(400, `Fila ${row.rowNumber}: datos inválidos.`);
      const data = parsed.data;
      const studentId = studentByDocument.get(data.documentId);
      const therapyId = therapyMap.get(key(data.therapyName));
      const professional = userByEmail.get(data.professionalEmail.toLowerCase());
      if (!studentId || !therapyId || !professional) {
        throw new HttpError(409, `Fila ${row.rowNumber}: estudiante, terapia o profesional no encontrado.`);
      }
      const current = await tx.attendance.findUnique({
        where: {
          studentId_date_therapyId_startTime: {
            studentId,
            therapyId,
            date: data.date,
            startTime: data.startTime,
          },
        },
        select: { id: true },
      });
      const payload = {
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        durationMinutes: minutesBetween(data.startTime, data.endTime),
        professionalId: professional.id,
        professionalName: professional.name,
        notes: data.notes ?? null,
        createdById: user.id,
      };
      await tx.attendance.upsert({
        where: {
          studentId_date_therapyId_startTime: {
            studentId,
            therapyId,
            date: data.date,
            startTime: data.startTime,
          },
        },
        update: payload,
        create: { studentId, therapyId, ...payload },
      });
      if (current) updated += 1;
      else created += 1;
    }
  });

  return { kind: "attendance", processed: rows.length, created, updated };
}

export async function commitImportBatch(batchId: string, user: SessionUser): Promise<ImportCommitResult> {
  const batch = await prisma.importBatch.findUnique({ where: { id: batchId } });
  if (!batch) throw new HttpError(404, "Lote de importación no encontrado.");
  if (batch.createdById !== user.id) throw new HttpError(403, "No puedes confirmar un lote de otro usuario.");
  if (batch.status !== "PREVIEW") throw new HttpError(409, "Este lote ya fue confirmado.");

  let stored: StoredBatch;
  try {
    stored = JSON.parse(batch.rowsJson) as StoredBatch;
  } catch {
    throw new HttpError(400, "El lote está dañado; vuelve a cargar el archivo.");
  }
  if (!Array.isArray(stored.rows) || !Array.isArray(stored.errors)) {
    throw new HttpError(400, "El lote está dañado; vuelve a cargar el archivo.");
  }
  if (stored.errors.length > 0) {
    throw new HttpError(400, "El archivo tiene errores. Corrígelos y analízalo de nuevo antes de confirmar.");
  }
  if (stored.rows.length === 0) throw new HttpError(400, "El lote no contiene filas para importar.");

  const referenceErrors = await validateImportReferences(batch.kind as ImportKind, stored.rows);
  if (referenceErrors.length > 0) {
    throw new HttpError(400, "Algunas referencias cambiaron desde la vista previa. Vuelve a cargar el archivo.");
  }

  let result: ImportCommitResult;
  if (batch.kind === "students") result = await commitStudents(stored.rows);
  else if (batch.kind === "therapies") result = await commitTherapies(stored.rows);
  else if (batch.kind === "attendance") result = await commitAttendance(stored.rows, user);
  else throw new HttpError(400, "Tipo de importación no soportado.");

  await prisma.importBatch.update({ where: { id: batch.id }, data: { status: "COMMITTED" } });

  revalidatePath("/import-export");
  revalidatePath("/students");
  revalidatePath("/attention");
  revalidatePath("/attendance");
  revalidatePath("/");
  return result;
}
