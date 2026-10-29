import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ClipboardList, Users } from "lucide-react";
import { getCourseScope, requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { calculateAge, formatDate } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { ROLE_LABELS, OBSERVATION_STATUS_LABELS } from "@/lib/constants";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CourseForm } from "@/components/courses/course-form";
import { ConfirmSubmitButton, SubmitButton } from "@/components/ui/form-buttons";
import {
  assignUserCourseAction,
  removeUserCourseAction,
} from "@/server/actions/courses";

export const metadata = { title: "Detalle del curso" };

export default async function CourseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  const scope = await getCourseScope(user);
  if (scope !== null && !scope.includes(id)) notFound();

  const settings = await getSettings();
  const [course, availableUsers] = await Promise.all([
    prisma.course.findUnique({
      where: { id },
      include: {
        students: { orderBy: [{ lastName: "asc" }, { firstName: "asc" }] },
        userLinks: { include: { user: { select: { id: true, name: true, email: true, role: true, active: true } } } },
        cycles: { orderBy: [{ year: "desc" }, { period: "desc" }] },
      },
    }),
    prisma.user.findMany({
      where: { active: true, role: { in: ["THERAPIST", "TEACHER", "COORDINATOR"] } },
      orderBy: { name: "asc" },
      select: { id: true, name: true, role: true },
    }),
  ]);

  if (!course) notFound();

  const linkedIds = new Set(course.userLinks.map((link) => link.userId));
  const candidates = availableUsers.filter((candidate) => !linkedIds.has(candidate.id));
  const canWrite = can(user.role, "courses.write");
  const year = Number(settings["school.year"] ?? course.year);

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<span className="text-xs text-slate-400">Cursos</span>}
        title={course.name}
        description={`${course.grade} · Año ${course.year} · ${course.students.length} estudiante(s)`}
        actions={
          <Link href="/courses">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" /> Volver
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Estudiantes del curso</CardTitle>
          </CardHeader>
          {course.students.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-slate-500">Este curso aún no tiene estudiantes.</p>
          ) : (
            <TableWrap className="rounded-none border-0 shadow-none">
              <Table>
                <THead>
                  <TR>
                    <TH>Estudiante</TH>
                    <TH>Documento</TH>
                    <TH>Edad</TH>
                    <TH>Estado</TH>
                  </TR>
                </THead>
                <TBody>
                  {course.students.map((student) => (
                    <TR key={student.id}>
                      <TD>
                        <Link href={`/students/${student.id}`} className="font-medium text-slate-800 hover:text-brand-700">
                          {student.lastName}, {student.firstName}
                        </Link>
                      </TD>
                      <TD className="font-mono text-xs">{student.documentId}</TD>
                      <TD>{calculateAge(student.birthDate) ?? "—"}</TD>
                      <TD>{student.active ? <Badge tone="green">Activo</Badge> : <Badge tone="slate">Inactivo</Badge>}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Personal asignado</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {course.userLinks.length === 0 ? (
              <p className="text-sm text-slate-500">Sin docentes ni terapeutas asignados.</p>
            ) : (
              course.userLinks.map((link) => (
                <div key={link.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">{link.user.name}</p>
                    <p className="text-xs text-slate-500">{ROLE_LABELS[link.user.role as keyof typeof ROLE_LABELS]}</p>
                  </div>
                  {canWrite ? (
                    <form action={removeUserCourseAction}>
                      <input type="hidden" name="courseId" value={course.id} />
                      <input type="hidden" name="userId" value={link.userId} />
                      <ConfirmSubmitButton variant="ghost" size="sm" message={`¿Quitar a ${link.user.name} de ${course.name}?`}>
                        Quitar
                      </ConfirmSubmitButton>
                    </form>
                  ) : null}
                </div>
              ))
            )}

            {canWrite && candidates.length > 0 ? (
              <form action={assignUserCourseAction} className="space-y-2 border-t border-slate-100 pt-3">
                <input type="hidden" name="courseId" value={course.id} />
                <label htmlFor="userId" className="block text-xs font-medium text-slate-600">
                  Asignar personal
                </label>
                <Select id="userId" name="userId" defaultValue="">
                  <option value="">Selecciona…</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.id} value={candidate.id}>
                      {candidate.name} · {ROLE_LABELS[candidate.role as keyof typeof ROLE_LABELS]}
                    </option>
                  ))}
                </Select>
                <SubmitButton variant="outline" size="sm" className="w-full">
                  Asignar al curso
                </SubmitButton>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Ciclos de observación F22</CardTitle>
            <ClipboardList className="size-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-2">
            {course.cycles.length === 0 ? (
              <p className="py-4 text-sm text-slate-500">Sin ciclos creados para este curso.</p>
            ) : (
              course.cycles.map((cycle) => (
                <Link
                  key={cycle.id}
                  href={`/observations/${cycle.id}`}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 hover:border-brand-200 hover:bg-brand-50/40"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-800">
                      {cycle.label ?? `Periodo ${cycle.period}`} · {cycle.year}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDate(cycle.dateFrom)} a {formatDate(cycle.dateTo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={cycle.status === "FINAL" ? "green" : "amber"}>
                      {OBSERVATION_STATUS_LABELS[cycle.status]}
                    </Badge>
                    <ArrowRight className="size-4 text-slate-400" />
                  </div>
                </Link>
              ))
            )}
            <Link href={`/observations?courseId=${course.id}`} className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
              <Users className="size-3.5" /> Gestionar observaciones del curso
            </Link>
          </CardContent>
        </Card>

        {canWrite ? (
          <Card>
            <CardHeader>
              <CardTitle>Datos del curso</CardTitle>
            </CardHeader>
            <CardContent>
              <CourseForm mode="edit" course={course} year={year} />
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
