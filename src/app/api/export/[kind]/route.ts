import ExcelJS from "exceljs";
import {
  HttpError,
  assertCourseAccess,
  getCourseScope,
  requireApiPermission,
  studentScopeWhere,
} from "@/lib/dal";
import { apiError } from "@/lib/api";
import { prisma } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";
import { formatDate, isValidIsoDate, startOfMonthIso, todayIso } from "@/lib/dates";
import { getAttentionSummary } from "@/lib/metrics";
import {
  EXPORT_KINDS,
  addDataSheet,
  safeFilename,
  workbookResponse,
  type ColumnDef,
  type ExportKind,
} from "@/lib/excel/common";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REQUIRED_PERMISSION: Record<ExportKind, Permission> = {
  students: "students.read",
  attendance: "attendance.read",
  attention: "attention.read",
  observations: "observations.read",
  followups: "followUps.read",
};

const SEX_LABELS: Record<string, string> = { F: "Femenino", M: "Masculino", X: "Otro" };

function isoParam(value: string | null): string | null {
  return value && isValidIsoDate(value) ? value : null;
}

function rangeFrom(search: URLSearchParams) {
  const today = todayIso();
  let from = isoParam(search.get("from")) ?? startOfMonthIso(today);
  let to = isoParam(search.get("to")) ?? today;
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

async function courseParam(search: URLSearchParams, scope: string[] | null) {
  const courseId = search.get("courseId") ?? "";
  if (!courseId) return "";
  if (scope && !scope.includes(courseId)) throw new HttpError(403, "No tienes acceso a este curso.");
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { id: true } });
  if (!course) throw new HttpError(404, "Curso no encontrado.");
  return course.id;
}

function text(value: string | null | undefined) {
  return value ?? "";
}

function workbook(kind: ExportKind) {
  const book = new ExcelJS.Workbook();
  book.creator = "FATR";
  book.created = new Date();
  book.title = kind;
  return book;
}

export async function GET(request: Request, { params }: { params: Promise<{ kind: string }> }) {
  try {
    const user = await requireApiPermission("data.export");
    const { kind } = await params;
    if (!(EXPORT_KINDS as readonly string[]).includes(kind)) {
      throw new HttpError(404, "Exportación no encontrada.");
    }
    const exportKind = kind as ExportKind;
    if (!can(user.role, REQUIRED_PERMISSION[exportKind])) {
      throw new HttpError(403, "No tienes permisos para exportar estos datos.");
    }

    const search = new URL(request.url).searchParams;
    const scope = await getCourseScope(user);

    if (exportKind === "students") {
      const courseId = await courseParam(search, scope);
      const includeDiagnosis = can(user.role, "students.viewDiagnosis");
      const students = await prisma.student.findMany({
        where: { ...studentScopeWhere(scope), ...(courseId ? { courseId } : {}) },
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
        select: {
          documentId: true,
          firstName: true,
          lastName: true,
          birthDate: true,
          sex: true,
          grade: true,
          guardianName: true,
          guardianPhone: true,
          guardianEmail: true,
          diagnosis: true,
          active: true,
          course: { select: { name: true } },
        },
      });

      const columns: ColumnDef[] = [
        { header: "Documento", key: "document", width: 16 },
        { header: "Nombres", key: "firstName", width: 22 },
        { header: "Apellidos", key: "lastName", width: 22 },
        { header: "Fecha de nacimiento", key: "birthDate", width: 18 },
        { header: "Sexo", key: "sex", width: 12 },
        { header: "Grado", key: "grade", width: 12 },
        { header: "Curso", key: "course", width: 22 },
        { header: "Acudiente", key: "guardianName", width: 24 },
        { header: "Teléfono del acudiente", key: "guardianPhone", width: 18 },
        { header: "Correo del acudiente", key: "guardianEmail", width: 26 },
        { header: "Estado", key: "status", width: 12 },
      ];
      if (includeDiagnosis) {
        columns.push({ header: "Diagnóstico", key: "diagnosis", width: 40 });
      }

      const rows = students.map((student) => ({
        document: student.documentId,
        firstName: student.firstName,
        lastName: student.lastName,
        birthDate: formatDate(student.birthDate, ""),
        sex: SEX_LABELS[student.sex] ?? student.sex,
        grade: student.grade,
        course: text(student.course?.name),
        guardianName: text(student.guardianName),
        guardianPhone: text(student.guardianPhone),
        guardianEmail: text(student.guardianEmail),
        status: student.active ? "Activo" : "Inactivo",
        ...(includeDiagnosis ? { diagnosis: text(student.diagnosis) } : {}),
      }));

      const book = workbook(exportKind);
      addDataSheet(book, "Estudiantes", columns, rows);
      return await workbookResponse(book, `estudiantes-${todayIso()}.xlsx`);
    }

    if (exportKind === "attendance") {
      const { from, to } = rangeFrom(search);
      const courseId = await courseParam(search, scope);
      const sessions = await prisma.attendance.findMany({
        where: {
          date: { gte: from, lte: to },
          student: { ...studentScopeWhere(scope), ...(courseId ? { courseId } : {}) },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }, { student: { lastName: "asc" } }],
        select: {
          date: true,
          startTime: true,
          endTime: true,
          durationMinutes: true,
          professionalName: true,
          notes: true,
          student: {
            select: {
              documentId: true,
              firstName: true,
              lastName: true,
              course: { select: { name: true } },
            },
          },
          therapy: { select: { nameEs: true } },
        },
      });

      const columns: ColumnDef[] = [
        { header: "Fecha", key: "date", width: 14 },
        { header: "Hora de inicio", key: "startTime", width: 14 },
        { header: "Hora de finalización", key: "endTime", width: 18 },
        { header: "Duración (min)", key: "duration", width: 14 },
        { header: "Documento del estudiante", key: "document", width: 20 },
        { header: "Estudiante", key: "student", width: 30 },
        { header: "Curso", key: "course", width: 22 },
        { header: "Terapia o área", key: "therapy", width: 24 },
        { header: "Profesional", key: "professional", width: 26 },
        { header: "Notas", key: "notes", width: 40 },
      ];
      const rows = sessions.map((session) => ({
        date: formatDate(session.date, ""),
        startTime: session.startTime,
        endTime: session.endTime,
        duration: session.durationMinutes ?? "",
        document: session.student.documentId,
        student: `${session.student.lastName}, ${session.student.firstName}`,
        course: text(session.student.course?.name),
        therapy: session.therapy.nameEs,
        professional: session.professionalName,
        notes: text(session.notes),
      }));

      const book = workbook(exportKind);
      addDataSheet(book, "Asistencia", columns, rows);
      return await workbookResponse(book, `asistencia-${from}-${to}.xlsx`);
    }

    if (exportKind === "attention") {
      const { from, to } = rangeFrom(search);
      const courseId = await courseParam(search, scope);
      const summary = await getAttentionSummary({
        scope,
        courseId: courseId || undefined,
        from,
        to,
      });

      const columns: ColumnDef[] = [
        { header: "Documento", key: "document", width: 16 },
        { header: "Estudiante", key: "student", width: 30 },
        { header: "Curso", key: "course", width: 22 },
      ];
      summary.therapies.forEach((therapy, index) => {
        columns.push(
          { header: `${therapy.nameEs} — asignada`, key: `t${index}_assigned`, width: 16 },
          { header: `${therapy.nameEs} — sesiones`, key: `t${index}_sessions`, width: 14 },
          { header: `${therapy.nameEs} — última fecha`, key: `t${index}_last`, width: 16 },
        );
      });

      const rows = summary.rows.map((row) => {
        const values: Record<string, unknown> = {
          document: row.student.documentId,
          student: `${row.student.lastName}, ${row.student.firstName}`,
          course: text(row.student.course?.name),
        };
        row.cells.forEach((cell, index) => {
          values[`t${index}_assigned`] = cell.assigned ? "Sí" : "No";
          values[`t${index}_sessions`] = cell.sessions;
          values[`t${index}_last`] = formatDate(cell.lastDate, "");
        });
        return values;
      });

      const book = workbook(exportKind);
      addDataSheet(book, "Relación de atención", columns, rows);
      return await workbookResponse(book, `relacion-atencion-${from}-${to}.xlsx`);
    }

    if (exportKind === "observations") {
      const cycleId = search.get("cycleId") ?? "";
      if (!cycleId) throw new HttpError(400, "Selecciona un ciclo de observación.");
      const cycle = await prisma.observationCycle.findUnique({
        where: { id: cycleId },
        select: {
          id: true,
          year: true,
          period: true,
          label: true,
          dateFrom: true,
          dateTo: true,
          courseId: true,
          course: { select: { name: true } },
        },
      });
      if (!cycle) throw new HttpError(404, "Ciclo de observación no encontrado.");
      await assertCourseAccess(user, cycle.courseId);

      const [domains, students, observations] = await Promise.all([
        prisma.domain.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
        prisma.student.findMany({
          where: { courseId: cycle.courseId, active: true },
          orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
          select: { id: true, documentId: true, firstName: true, lastName: true },
        }),
        prisma.observation.findMany({
          where: { cycleId: cycle.id },
          select: {
            studentId: true,
            observationDate: true,
            parentMeetingDate: true,
            parentAttended: true,
            studentMeetingDate: true,
            diagnosisNote: true,
            nextFollowUpDate: true,
            scores: { select: { domainId: true, level: true, note: true } },
          },
        }),
      ]);

      const observationByStudent = new Map(observations.map((observation) => [observation.studentId, observation]));
      const columns: ColumnDef[] = [
        { header: "Documento", key: "document", width: 16 },
        { header: "Estudiante", key: "student", width: 30 },
      ];
      domains.forEach((domain, index) => {
        columns.push(
          { header: `${domain.nameEs} — nivel`, key: `d${index}_level`, width: 14 },
          { header: `${domain.nameEs} — nota`, key: `d${index}_note`, width: 30 },
        );
      });
      columns.push(
        { header: "Fecha de observación", key: "observationDate", width: 18 },
        { header: "Cita con acudiente", key: "parentMeetingDate", width: 18 },
        { header: "Asistió el acudiente", key: "parentAttended", width: 16 },
        { header: "Cita con el estudiante", key: "studentMeetingDate", width: 20 },
        { header: "Diagnóstico / remisión", key: "diagnosisNote", width: 40 },
        { header: "Seguimiento proyectado", key: "nextFollowUpDate", width: 20 },
      );

      const rows = students.map((student) => {
        const observation = observationByStudent.get(student.id);
        const scoreByDomain = new Map(
          (observation?.scores ?? []).map((score) => [score.domainId, score]),
        );
        const values: Record<string, unknown> = {
          document: student.documentId,
          student: `${student.lastName}, ${student.firstName}`,
          observationDate: formatDate(observation?.observationDate, ""),
          parentMeetingDate: formatDate(observation?.parentMeetingDate, ""),
          parentAttended:
            observation?.parentAttended === null || observation?.parentAttended === undefined
              ? ""
              : observation.parentAttended
                ? "Sí"
                : "No",
          studentMeetingDate: formatDate(observation?.studentMeetingDate, ""),
          diagnosisNote: text(observation?.diagnosisNote),
          nextFollowUpDate: formatDate(observation?.nextFollowUpDate, ""),
        };
        domains.forEach((domain, index) => {
          const score = scoreByDomain.get(domain.id);
          values[`d${index}_level`] = score?.level ?? "";
          values[`d${index}_note`] = text(score?.note);
        });
        return values;
      });

      const book = workbook(exportKind);
      addDataSheet(
        book,
        "F22",
        columns,
        rows,
      );
      const label = cycle.label ?? `Periodo ${cycle.period}`;
      return await workbookResponse(
        book,
        `f22-${cycle.year}-${safeFilename(label)}-${safeFilename(cycle.course.name)}.xlsx`,
      );
    }

    const followUps = await prisma.followUp.findMany({
      where: { student: studentScopeWhere(scope) },
      orderBy: [{ followUpDate: "desc" }, { createdAt: "desc" }],
      select: {
        cycleLabel: true,
        startDate: true,
        followUpDate: true,
        realizationDate: true,
        diagnosisSnapshot: true,
        descriptionInitial: true,
        strategies: true,
        achievements: true,
        followUpNotes: true,
        responsibleName: true,
        workArea: true,
        counselorName: true,
        status: true,
        student: {
          select: {
            documentId: true,
            firstName: true,
            lastName: true,
            course: { select: { name: true } },
          },
        },
      },
    });

    const columns: ColumnDef[] = [
      { header: "Documento", key: "document", width: 16 },
      { header: "Estudiante", key: "student", width: 30 },
      { header: "Curso", key: "course", width: 22 },
      { header: "Periodo", key: "cycleLabel", width: 18 },
      { header: "Fecha de inicio", key: "startDate", width: 16 },
      { header: "Fecha de seguimiento", key: "followUpDate", width: 18 },
      { header: "Fecha de realización", key: "realizationDate", width: 18 },
      { header: "Estado", key: "status", width: 12 },
      { header: "Responsable", key: "responsibleName", width: 26 },
      { header: "Área", key: "workArea", width: 20 },
      { header: "Orientadora", key: "counselorName", width: 24 },
      { header: "Diagnóstico", key: "diagnosis", width: 40 },
      { header: "Descripción del estado inicial", key: "descriptionInitial", width: 50 },
      { header: "Técnicas y estrategias", key: "strategies", width: 50 },
      { header: "Alcances", key: "achievements", width: 50 },
      { header: "Seguimiento", key: "followUpNotes", width: 50 },
    ];
    const rows = followUps.map((followUp) => ({
      document: followUp.student.documentId,
      student: `${followUp.student.lastName}, ${followUp.student.firstName}`,
      course: text(followUp.student.course?.name),
      cycleLabel: text(followUp.cycleLabel),
      startDate: formatDate(followUp.startDate, ""),
      followUpDate: formatDate(followUp.followUpDate, ""),
      realizationDate: formatDate(followUp.realizationDate, ""),
      status: followUp.status === "FINAL" ? "Finalizado" : "Borrador",
      responsibleName: followUp.responsibleName,
      workArea: text(followUp.workArea),
      counselorName: text(followUp.counselorName),
      diagnosis: text(followUp.diagnosisSnapshot),
      descriptionInitial: text(followUp.descriptionInitial),
      strategies: text(followUp.strategies),
      achievements: text(followUp.achievements),
      followUpNotes: text(followUp.followUpNotes),
    }));

    const book = workbook(exportKind);
    addDataSheet(book, "F23 Seguimientos", columns, rows);
    return await workbookResponse(book, `f23-seguimientos-${todayIso()}.xlsx`);
  } catch (error) {
    return apiError(error);
  }
}
