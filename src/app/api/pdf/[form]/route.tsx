import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { apiError } from "@/lib/api";
import {
  HttpError,
  assertCourseAccess,
  getCourseScope,
  requireApiPermission,
  studentScopeWhere,
  type SessionUser,
} from "@/lib/dal";
import { FORM_KEYS, type FormKey } from "@/lib/constants";
import type { Permission } from "@/lib/permissions";
import { formMeta, getSettings, institutionLogo, institutionName, type SettingsMap } from "@/lib/settings";
import { calculateAge, isValidIsoDate, startOfMonthIso, todayIso } from "@/lib/dates";
import { getAttentionSummary } from "@/lib/metrics";
import { registerPdfFonts } from "@/lib/pdf/fonts";
import { resolveLogoSource } from "@/lib/pdf/logo";
import type { PdfHeaderInfo } from "@/lib/pdf/types";
import { F22Document, type F22Row } from "@/lib/pdf/f22";
import { F23Document } from "@/lib/pdf/f23";
import { F24Document } from "@/lib/pdf/f24";
import { F25Document, type F25Row } from "@/lib/pdf/f25";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERMISSION_BY_FORM: Record<FormKey, Permission> = {
  f22: "observations.read",
  f23: "followUps.read",
  f24: "attention.read",
  f25: "attendance.read",
};

function pdfHeader(settings: SettingsMap, form: FormKey): PdfHeaderInfo {
  const meta = formMeta(settings, form);
  return {
    institution: institutionName(settings),
    logo: resolveLogoSource(institutionLogo(settings)),
    code: meta.code,
    version: meta.version,
    validity: meta.validity,
  };
}

function pdfResponse(buffer: Buffer, filename: string, download: boolean) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safeLabel(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

async function scopedCourseLabel(user: SessionUser, courseId: string | null) {
  if (courseId) {
    const course = await prisma.course.findUnique({ where: { id: courseId }, select: { name: true } });
    if (!course) throw new HttpError(404, "Curso no encontrado.");
    await assertCourseAccess(user, courseId);
    return course.name;
  }
  const scope = await getCourseScope(user);
  return scope === null ? "Todos los cursos" : "Cursos asignados";
}

async function buildF22(user: SessionUser, settings: SettingsMap, cycleId: string | null, download: boolean) {
  if (!cycleId) throw new HttpError(400, "Selecciona un ciclo de observación.");
  const cycle = await prisma.observationCycle.findUnique({
    where: { id: cycleId },
    include: { course: { select: { id: true, name: true } } },
  });
  if (!cycle) throw new HttpError(404, "Ciclo de observación no encontrado.");
  await assertCourseAccess(user, cycle.courseId);

  const [domains, students] = await Promise.all([
    prisma.domain.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.student.findMany({
      where: {
        courseId: cycle.courseId,
        OR: [{ active: true }, { observations: { some: { cycleId: cycle.id } } }],
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        firstName: true,
        lastName: true,
        documentId: true,
        observations: {
          where: { cycleId: cycle.id },
          select: {
            observationDate: true,
            parentMeetingDate: true,
            parentAttended: true,
            studentMeetingDate: true,
            diagnosisNote: true,
            nextFollowUpDate: true,
            scores: { select: { domainId: true, level: true, note: true } },
          },
        },
      },
    }),
  ]);

  const rows: F22Row[] = students.map((student) => {
    const observation = student.observations[0];
    return {
      studentName: `${student.lastName}, ${student.firstName}`,
      documentId: student.documentId,
      observationDate: observation?.observationDate ?? null,
      parentMeetingDate: observation?.parentMeetingDate ?? null,
      parentAttended: observation?.parentAttended ?? null,
      studentMeetingDate: observation?.studentMeetingDate ?? null,
      diagnosisNote: observation?.diagnosisNote ?? null,
      nextFollowUpDate: observation?.nextFollowUpDate ?? null,
      scores: observation?.scores ?? [],
    };
  });

  const meta = formMeta(settings, "f22");
  const buffer = await renderToBuffer(
    <F22Document
      data={{
        header: pdfHeader(settings, "f22"),
        cycle: {
          label: cycle.label ?? `Periodo ${cycle.period}`,
          year: cycle.year,
          period: cycle.period,
          dateFrom: cycle.dateFrom,
          dateTo: cycle.dateTo,
          status: cycle.status,
          courseName: cycle.course.name,
        },
        domains: domains.map((domain) => ({ id: domain.id, nameEs: domain.nameEs, nameEn: domain.nameEn })),
        rows,
        rowsPerPage: Math.min(40, Math.max(5, meta.rowsPerPage)),
      }}
    />,
  );
  return pdfResponse(buffer, `${safeLabel(meta.code)}-${safeLabel(cycle.course.name)}-${cycle.year}-P${cycle.period}.pdf`, download);
}

async function buildF23(user: SessionUser, settings: SettingsMap, id: string | null, download: boolean) {
  if (!id) throw new HttpError(400, "Selecciona un seguimiento.");
  const record = await prisma.followUp.findUnique({
    where: { id },
    include: {
      student: {
        select: {
          firstName: true,
          lastName: true,
          documentId: true,
          birthDate: true,
          sex: true,
          grade: true,
          courseId: true,
          course: { select: { name: true } },
        },
      },
    },
  });
  if (!record) throw new HttpError(404, "Seguimiento no encontrado.");
  await assertCourseAccess(user, record.student.courseId);

  const meta = formMeta(settings, "f23");
  const buffer = await renderToBuffer(
    <F23Document
      data={{
        header: pdfHeader(settings, "f23"),
        followUp: {
          cycleLabel: record.cycleLabel,
          startDate: record.startDate,
          followUpDate: record.followUpDate,
          realizationDate: record.realizationDate,
          diagnosisSnapshot: record.diagnosisSnapshot,
          descriptionInitial: record.descriptionInitial,
          strategies: record.strategies,
          achievements: record.achievements,
          followUpNotes: record.followUpNotes,
          responsibleName: record.responsibleName,
          workArea: record.workArea,
          counselorName: record.counselorName,
          status: record.status,
          student: {
            fullName: `${record.student.firstName} ${record.student.lastName}`,
            documentId: record.student.documentId,
            age: calculateAge(record.student.birthDate, record.realizationDate),
            sex: record.student.sex,
            grade: record.student.grade,
            courseName: record.student.course?.name ?? "Sin curso",
          },
        },
      }}
    />,
  );
  return pdfResponse(
    buffer,
    `${safeLabel(meta.code)}-${safeLabel(record.student.lastName)}-${record.realizationDate}.pdf`,
    download,
  );
}

async function buildF24(
  user: SessionUser,
  settings: SettingsMap,
  courseId: string | null,
  fromParam: string | null,
  toParam: string | null,
  download: boolean,
) {
  const today = todayIso();
  let from = isValidIsoDate(fromParam) ? (fromParam as string) : startOfMonthIso(today);
  let to = isValidIsoDate(toParam) ? (toParam as string) : today;
  if (from > to) [from, to] = [to, from];

  const courseLabel = await scopedCourseLabel(user, courseId);
  const scope = await getCourseScope(user);
  const summary = await getAttentionSummary({ scope, courseId: courseId ?? undefined, from, to });
  const meta = formMeta(settings, "f24");

  const rows = summary.rows.map((row) => ({
    studentName: `${row.student.lastName}, ${row.student.firstName}`,
    documentId: row.student.documentId,
    courseName: row.student.course?.name ?? "Sin curso",
    cells: row.cells,
  }));

  const buffer = await renderToBuffer(
    <F24Document
      data={{
        header: pdfHeader(settings, "f24"),
        courseLabel,
        from,
        to,
        therapies: summary.therapies.map((therapy) => ({ id: therapy.id, key: therapy.key, nameEs: therapy.nameEs })),
        rows,
        rowsPerPage: Math.min(20, Math.max(1, meta.rowsPerPage)),
      }}
    />,
  );
  return pdfResponse(
    buffer,
    `${safeLabel(meta.code)}-${safeLabel(courseLabel)}-${from}-${to}.pdf`,
    download,
  );
}

async function buildF25(
  user: SessionUser,
  settings: SettingsMap,
  dateParam: string | null,
  courseId: string | null,
  download: boolean,
) {
  const date = isValidIsoDate(dateParam) ? (dateParam as string) : todayIso();
  const courseLabel = await scopedCourseLabel(user, courseId);
  const scope = await getCourseScope(user);

  const sessions = await prisma.attendance.findMany({
    where: {
      date,
      student: { ...studentScopeWhere(scope), ...(courseId ? { courseId } : {}) },
    },
    orderBy: [{ startTime: "asc" }, { student: { lastName: "asc" } }, { student: { firstName: "asc" } }],
    select: {
      startTime: true,
      endTime: true,
      durationMinutes: true,
      professionalName: true,
      notes: true,
      student: { select: { firstName: true, lastName: true, documentId: true } },
      therapy: { select: { nameEs: true } },
      signatures: { select: { role: true, data: true, signerName: true } },
    },
  });

  const rows: F25Row[] = sessions.map((session) => {
    const professional = session.signatures.find((signature) => signature.role === "PROFESSIONAL");
    const guardian = session.signatures.find((signature) => signature.role === "GUARDIAN");
    return {
      studentName: `${session.student.lastName}, ${session.student.firstName}`,
      documentId: session.student.documentId,
      therapyName: session.therapy.nameEs,
      startTime: session.startTime,
      endTime: session.endTime,
      durationMinutes: session.durationMinutes,
      professionalName: session.professionalName,
      notes: session.notes,
      professionalSignature: {
        dataUri: professional ? `data:image/png;base64,${Buffer.from(professional.data).toString("base64")}` : null,
        signerName: professional?.signerName ?? null,
      },
      guardianSignature: {
        dataUri: guardian ? `data:image/png;base64,${Buffer.from(guardian.data).toString("base64")}` : null,
        signerName: guardian?.signerName ?? null,
      },
    };
  });

  const meta = formMeta(settings, "f25");
  const buffer = await renderToBuffer(
    <F25Document
      data={{
        header: pdfHeader(settings, "f25"),
        date,
        courseLabel,
        rows,
        rowsPerPage: Math.min(30, Math.max(1, meta.rowsPerPage)),
      }}
    />,
  );
  return pdfResponse(
    buffer,
    `${safeLabel(meta.code)}-${safeLabel(courseLabel)}-${date}.pdf`,
    download,
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ form: string }> }) {
  try {
    const { form: rawForm } = await params;
    if (!FORM_KEYS.includes(rawForm as FormKey)) throw new HttpError(404, "Formato no encontrado.");
    const form = rawForm as FormKey;

    const user = await requireApiPermission(PERMISSION_BY_FORM[form]);
    const url = new URL(request.url);
    const search = url.searchParams;
    const download = search.get("download") === "1";
    const settings = await getSettings();
    registerPdfFonts();

    if (form === "f22") return await buildF22(user, settings, search.get("cycleId"), download);
    if (form === "f23") return await buildF23(user, settings, search.get("id"), download);
    if (form === "f24") {
      return await buildF24(user, settings, search.get("courseId"), search.get("from"), search.get("to"), download);
    }
    return await buildF25(user, settings, search.get("date"), search.get("courseId"), download);
  } catch (error) {
    return apiError(error);
  }
}
