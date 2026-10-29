import "server-only";
import { prisma } from "@/lib/db";
import type { ImportKind } from "@/lib/excel/common";
import type { ImportError, ImportRow } from "@/lib/excel/parser";

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function key(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function duplicates(entries: { key: string; rowNumber: number }[]) {
  const groups = new Map<string, number[]>();
  for (const entry of entries) {
    if (!entry.key) continue;
    const list = groups.get(entry.key) ?? [];
    list.push(entry.rowNumber);
    groups.set(entry.key, list);
  }
  return [...groups.entries()].filter(([, rows]) => rows.length > 1);
}

export async function validateImportReferences(kind: ImportKind, rows: ImportRow[]): Promise<ImportError[]> {
  const errors: ImportError[] = [];
  const add = (rowNumber: number, message: string) => {
    const existing = errors.find((error) => error.rowNumber === rowNumber);
    if (existing) existing.messages.push(message);
    else errors.push({ rowNumber, messages: [message] });
  };

  if (kind === "students") {
    const courses = await prisma.course.findMany({
      where: { active: true },
      select: { name: true },
    });
    const knownCourses = new Set(courses.map((course) => key(course.name)));
    for (const row of rows) {
      const courseName = text(row.data.courseName);
      if (courseName && !knownCourses.has(key(courseName))) {
        add(row.rowNumber, `El curso "${courseName}" no existe o está inactivo.`);
      }
    }
    for (const [, rowNumbers] of duplicates(
      rows.map((row) => ({ key: text(row.data.documentId), rowNumber: row.rowNumber })),
    )) {
      rowNumbers.forEach((rowNumber) => add(rowNumber, "El documento está repetido en el archivo."));
    }
    return errors;
  }

  const documents = [...new Set(rows.map((row) => text(row.data.documentId)).filter(Boolean))];
  const students = await prisma.student.findMany({
    where: { documentId: { in: documents } },
    select: { documentId: true, active: true },
  });
  const studentByDocument = new Map(students.map((student) => [student.documentId, student]));

  const therapies = await prisma.therapy.findMany({ where: { active: true } });
  const therapyMap = new Map<string, (typeof therapies)[number]>();
  for (const therapy of therapies) {
    therapyMap.set(key(therapy.nameEs), therapy);
    therapyMap.set(key(therapy.key), therapy);
  }

  for (const row of rows) {
    const documentId = text(row.data.documentId);
    const student = studentByDocument.get(documentId);
    if (!student) add(row.rowNumber, `No existe un estudiante con documento ${documentId}.`);
    else if (!student.active) add(row.rowNumber, `El estudiante ${documentId} está inactivo.`);

    const therapyName = text(row.data.therapyName);
    if (!therapyMap.has(key(therapyName))) {
      add(row.rowNumber, `La terapia o área "${therapyName}" no existe o está inactiva.`);
    }
  }

  if (kind === "therapies") {
    const emails = [...new Set(rows.map((row) => text(row.data.therapistEmail).toLowerCase()).filter(Boolean))];
    const users = emails.length
      ? await prisma.user.findMany({
          where: { email: { in: emails }, active: true },
          select: { email: true },
        })
      : [];
    const knownUsers = new Set(users.map((user) => user.email.toLowerCase()));
    for (const row of rows) {
      const email = text(row.data.therapistEmail).toLowerCase();
      if (email && !knownUsers.has(email)) {
        add(row.rowNumber, `No existe un usuario activo con correo ${email}.`);
      }
    }
    for (const [, rowNumbers] of duplicates(
      rows.map((row) => ({
        key: `${text(row.data.documentId)}|${key(text(row.data.therapyName))}`,
        rowNumber: row.rowNumber,
      })),
    )) {
      rowNumbers.forEach((rowNumber) =>
        add(rowNumber, "La asignación estudiante + terapia está repetida en el archivo."),
      );
    }
    return errors;
  }

  const emails = [...new Set(rows.map((row) => text(row.data.professionalEmail).toLowerCase()).filter(Boolean))];
  const users = emails.length
    ? await prisma.user.findMany({
        where: { email: { in: emails }, active: true },
        select: { email: true },
      })
    : [];
  const knownUsers = new Set(users.map((user) => user.email.toLowerCase()));
  for (const row of rows) {
    const email = text(row.data.professionalEmail).toLowerCase();
    if (email && !knownUsers.has(email)) {
      add(row.rowNumber, `No existe un usuario activo con correo ${email}.`);
    }
  }
  for (const [, rowNumbers] of duplicates(
    rows.map((row) => ({
      key: `${text(row.data.documentId)}|${text(row.data.date)}|${key(text(row.data.therapyName))}|${text(row.data.startTime)}`,
      rowNumber: row.rowNumber,
    })),
  )) {
    rowNumbers.forEach((rowNumber) =>
      add(rowNumber, "La sesión está repetida en el archivo (estudiante, fecha, terapia y hora inicial)."),
    );
  }

  return errors;
}
