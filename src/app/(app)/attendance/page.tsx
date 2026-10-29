import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { CalendarCheck, FileDown, PenLine } from "lucide-react";
import { getCourseScope, requireUser, studentScopeWhere } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDate, formatDateLong, formatDuration, isValidIsoDate, todayIso } from "@/lib/dates";
import { getSettings, requiresSignature } from "@/lib/settings";
import type { Role } from "@/lib/constants";
import { Badge, Card, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, TBody, TD, TH, THead, TR, Pagination } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AttendanceSheet } from "@/components/attendance/attendance-sheet";

export const metadata = { title: "Registro de asistencia (F25)" };

const SHEET_ROWS = 12;
const PROFESSIONAL_ROLES: Role[] = ["ADMIN", "COORDINATOR", "THERAPIST"];

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; course?: string; page?: string; studentId?: string }>;
}) {
  const user = await requireUser();
  if (!can(user.role, "attendance.read")) notFound();

  const scope = await getCourseScope(user);
  const params = await searchParams;
  const today = todayIso();
  const date = params.date && isValidIsoDate(params.date) ? params.date : today;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const canWrite = can(user.role, "attendance.write");

  const courses = await prisma.course.findMany({
    where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
  const courseId = params.course && courses.some((course) => course.id === params.course) ? params.course : "";
  if (params.course && !courseId) notFound();

  const where = {
    date,
    student: { ...studentScopeWhere(scope), ...(courseId ? { courseId } : {}) },
  };

  const [total, sessions, totalMinutesRow, students, therapies, professionals, settings] = await Promise.all([
    prisma.attendance.count({ where }),
    prisma.attendance.findMany({
      where,
      orderBy: [{ startTime: "asc" }, { student: { lastName: "asc" } }],
      skip: (page - 1) * SHEET_ROWS,
      take: SHEET_ROWS,
      select: {
        id: true,
        startTime: true,
        endTime: true,
        durationMinutes: true,
        professionalName: true,
        notes: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentId: true,
            course: { select: { name: true } },
          },
        },
        therapy: { select: { nameEs: true } },
        signatures: { select: { id: true, role: true } },
      },
    }),
    prisma.attendance.aggregate({ where, _sum: { durationMinutes: true } }),
    prisma.student.findMany({
      where: { active: true, ...studentScopeWhere(scope), ...(courseId ? { courseId } : {}) },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentId: true,
        course: { select: { name: true } },
      },
    }),
    prisma.therapy.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      select: { id: true, nameEs: true, kind: true },
    }),
    prisma.user.findMany({
      where: { active: true, role: { in: PROFESSIONAL_ROLES } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
    getSettings(),
  ]);

  const studentOptions = students.map((student) => ({
    id: student.id,
    name: `${student.lastName}, ${student.firstName}`,
    documentId: student.documentId,
    courseName: student.course?.name ?? "Sin curso",
  }));
  const defaultStudentId = studentOptions.some((option) => option.id === params.studentId)
    ? params.studentId
    : undefined;
  const professionalOptions = professionals.map((professional) => ({
    id: professional.id,
    name: professional.name,
    role: professional.role as Role,
  }));
  const defaultProfessionalId = professionalOptions.some((professional) => professional.id === user.id)
    ? user.id
    : (professionalOptions[0]?.id ?? user.id);

  const totalPages = Math.max(1, Math.ceil(total / SHEET_ROWS));
  const buildHref = (target: number) => {
    const query = new URLSearchParams();
    query.set("date", date);
    if (courseId) query.set("course", courseId);
    query.set("page", String(target));
    return `/attendance?${query.toString()}`;
  };

  const pdfQuery = new URLSearchParams();
  pdfQuery.set("date", date);
  if (courseId) pdfQuery.set("courseId", courseId);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Registro de asistencia"
        description="Formato PM-04-F25. Bitácora diaria de sesiones con horario, profesional y firmas."
        actions={
          <>
            {canWrite ? (
              <Link
                href="#registrar"
                className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-300 bg-white px-3 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
              >
                <PenLine className="size-4" /> Nueva sesión
              </Link>
            ) : null}
            <Link href={`/api/pdf/f25?${pdfQuery.toString()}`} target="_blank">
              <Button variant="outline" size="sm">
                <FileDown className="size-4" /> PDF oficial
              </Button>
            </Link>
          </>
        }
      />

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="sm:w-48">
            <label htmlFor="date" className="mb-1 block text-xs font-medium text-slate-600">
              Fecha
            </label>
            <Input id="date" name="date" type="date" defaultValue={date} />
          </div>
          <div className="sm:w-64">
            <label htmlFor="course" className="mb-1 block text-xs font-medium text-slate-600">
              Curso
            </label>
            <Select id="course" name="course" defaultValue={courseId}>
              <option value="">Todos tus cursos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </Select>
          </div>
          <Button type="submit" variant="outline">
            Consultar
          </Button>
          {date !== today || courseId ? (
            <Link href="/attendance" className="pb-2.5 text-xs text-brand-700 hover:underline">
              Hoy
            </Link>
          ) : null}
        </form>
      </Card>

      <Card>
        <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Hoja diaria</CardTitle>
            <p className="text-xs text-slate-500">{formatDateLong(date)}</p>
          </div>
          <div className="text-right text-xs text-slate-500">
            <p>
              {total} sesión(es) · {formatDuration(totalMinutesRow._sum.durationMinutes)}
            </p>
            <p>{courseId ? courses.find((course) => course.id === courseId)?.name : "Todos los cursos"}</p>
          </div>
        </CardHeader>

        {sessions.length === 0 ? (
          <EmptyState
            icon={<CalendarCheck className="size-10" />}
            title="Sin sesiones registradas"
            description={`No hay asistencias para el ${formatDate(date)} con los filtros actuales.`}
          />
        ) : (
          <>
            <TableWrap className="rounded-none border-0 shadow-none">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-10">#</TH>
                    <TH>Estudiante</TH>
                    <TH>Terapia / área</TH>
                    <TH>Horario</TH>
                    <TH>Duración</TH>
                    <TH>Profesional</TH>
                    <TH>Firmas</TH>
                    <TH>Observaciones</TH>
                  </TR>
                </THead>
                <TBody>
                  {sessions.map((session, index) => (
                    <TR key={session.id} className="hover:bg-slate-50/60">
                      <TD className="text-xs text-slate-400">{(page - 1) * SHEET_ROWS + index + 1}</TD>
                      <TD>
                        <Link
                          href={`/students/${session.student.id}`}
                          className="font-medium text-slate-900 hover:text-brand-700"
                        >
                          {session.student.lastName}, {session.student.firstName}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {session.student.documentId} · {session.student.course?.name ?? "Sin curso"}
                        </p>
                      </TD>
                      <TD>{session.therapy.nameEs}</TD>
                      <TD className="whitespace-nowrap font-mono text-xs">
                        {session.startTime}–{session.endTime}
                      </TD>
                      <TD className="whitespace-nowrap">{formatDuration(session.durationMinutes)}</TD>
                      <TD>{session.professionalName}</TD>
                      <TD>
                        <div className="flex flex-wrap items-center gap-1.5">
                          {session.signatures.map((signature) => (
                            <span
                              key={signature.id}
                              className="inline-flex items-center gap-1 rounded border border-slate-100 bg-white px-1 py-0.5"
                              title={signature.role === "PROFESSIONAL" ? "Firma del profesional" : "Firma del acudiente"}
                            >
                              <Image
                                src={`/api/signatures/${signature.id}`}
                                alt="Firma"
                                width={48}
                                height={20}
                                unoptimized
                                style={{ width: "auto", height: "auto" }}
                              />
                              <span className="text-[10px] text-slate-500">
                                {signature.role === "PROFESSIONAL" ? "Prof." : "Acud."}
                              </span>
                            </span>
                          ))}
                          {session.signatures.length === 0 ? (
                            <Badge tone="amber">Sin firma</Badge>
                          ) : null}
                        </div>
                      </TD>
                      <TD className="max-w-48">
                        <p className="truncate text-xs text-slate-500" title={session.notes ?? undefined}>
                          {session.notes ?? "—"}
                        </p>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
            <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
          </>
        )}
      </Card>

      <div id="registrar" className="scroll-mt-20">
        {canWrite ? (
          studentOptions.length === 0 ? (
            <Card className="border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              No hay estudiantes activos en los cursos seleccionados. Asigna primero un curso a los estudiantes.
            </Card>
          ) : (
            <AttendanceSheet
              students={studentOptions}
              therapies={therapies}
              professionals={professionalOptions}
              defaultDate={date}
              defaultProfessionalId={defaultProfessionalId}
              defaultStudentId={defaultStudentId}
              requireSignature={requiresSignature(settings)}
            />
          )
        ) : (
          <Card className="px-4 py-3 text-sm text-slate-600">
            Tu rol permite consultar la asistencia, pero no registrar sesiones.
          </Card>
        )}
      </div>
    </div>
  );
}
