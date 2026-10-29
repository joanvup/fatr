import Link from "next/link";
import { Fragment } from "react";
import { notFound } from "next/navigation";
import { Activity, CalendarCheck, FileDown } from "lucide-react";
import { getCourseScope, requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getAttentionSummary } from "@/lib/metrics";
import { formatDate, isValidIsoDate, startOfMonthIso, todayIso } from "@/lib/dates";
import { Badge, Card, CardContent, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Relación de atención (F24)" };

export default async function AttentionPage({
  searchParams,
}: {
  searchParams: Promise<{ course?: string; from?: string; to?: string }>;
}) {
  const user = await requireUser();
  if (!can(user.role, "attention.read")) notFound();

  const scope = await getCourseScope(user);
  const params = await searchParams;
  const today = todayIso();

  const courses = await prisma.course.findMany({
    where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  const courseId = params.course && courses.some((course) => course.id === params.course) ? params.course : "";
  if (params.course && !courseId) notFound();

  let from = params.from && isValidIsoDate(params.from) ? params.from : startOfMonthIso(today);
  let to = params.to && isValidIsoDate(params.to) ? params.to : today;
  if (from > to) [from, to] = [to, from];

  const summary = await getAttentionSummary({
    scope,
    courseId: courseId || undefined,
    from,
    to,
  });

  const therapies = summary.therapies;
  const totalByTherapy = therapies.map((therapy) =>
    summary.rows.reduce(
      (acc, row) => acc + (row.cells.find((cell) => cell.therapyId === therapy.id)?.sessions ?? 0),
      0,
    ),
  );
  const grandTotal = totalByTherapy.reduce((acc, value) => acc + value, 0);
  const assignedCount = summary.rows.reduce(
    (acc, row) => acc + row.cells.filter((cell) => cell.assigned).length,
    0,
  );

  const pdfQuery = new URLSearchParams();
  if (courseId) pdfQuery.set("courseId", courseId);
  pdfQuery.set("from", from);
  pdfQuery.set("to", to);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Relación de atención"
        description="Formato PM-04-F24. Terapias asignadas y sesiones realizadas por estudiante en el rango consultado."
        actions={
          <>
            {can(user.role, "attendance.write") ? (
              <Link href="/attendance">
                <Button variant="outline" size="sm">
                  <CalendarCheck className="size-4" /> Registrar sesión
                </Button>
              </Link>
            ) : null}
            <Link href={`/api/pdf/f24?${pdfQuery.toString()}`} target="_blank">
              <Button variant="outline" size="sm">
                <FileDown className="size-4" /> PDF oficial
              </Button>
            </Link>
          </>
        }
      />

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
          <div className="sm:w-44">
            <label htmlFor="from" className="mb-1 block text-xs font-medium text-slate-600">
              Desde
            </label>
            <Input id="from" name="from" type="date" defaultValue={from} />
          </div>
          <div className="sm:w-44">
            <label htmlFor="to" className="mb-1 block text-xs font-medium text-slate-600">
              Hasta
            </label>
            <Input id="to" name="to" type="date" defaultValue={to} />
          </div>
          <Button type="submit" variant="outline">
            Consultar
          </Button>
          {courseId || from !== startOfMonthIso(today) || to !== today ? (
            <Link href="/attention" className="pb-2.5 text-xs text-brand-700 hover:underline">
              Limpiar
            </Link>
          ) : null}
        </form>
      </Card>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="rounded-lg bg-brand-50 p-2 text-brand-700">
            <Activity className="size-4" />
          </span>
          <div>
            <p className="text-xl font-semibold text-slate-900">{summary.rows.length}</p>
            <p className="text-xs text-slate-500">Estudiantes activos</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="rounded-lg bg-emerald-50 p-2 text-emerald-700">
            <CalendarCheck className="size-4" />
          </span>
          <div>
            <p className="text-xl font-semibold text-slate-900">{grandTotal}</p>
            <p className="text-xs text-slate-500">Sesiones en el rango</p>
          </div>
        </Card>
        <Card className="flex items-center gap-3 px-4 py-3">
          <span className="rounded-lg bg-violet-50 p-2 text-violet-700">
            <Activity className="size-4" />
          </span>
          <div>
            <p className="text-xl font-semibold text-slate-900">{assignedCount}</p>
            <p className="text-xs text-slate-500">Asignaciones de terapia vigentes</p>
          </div>
        </Card>
      </div>

      {summary.rows.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Activity className="size-10" />}
            title="Sin estudiantes para el filtro"
            description="No hay estudiantes activos en los cursos seleccionados."
          />
        </Card>
      ) : (
        <Card>
          <CardContent className="space-y-3 px-0 py-0">
            <TableWrap className="rounded-none border-0 shadow-none">
              <Table>
                <THead>
                  <TR>
                    <TH rowSpan={2}>Estudiante</TH>
                    <TH rowSpan={2}>Curso</TH>
                    {therapies.map((therapy) => (
                      <TH key={therapy.id} colSpan={2} className="border-l border-slate-200 text-center">
                        {therapy.nameEs}
                      </TH>
                    ))}
                    <TH rowSpan={2} className="border-l border-slate-200 text-center">
                      Total
                    </TH>
                  </TR>
                  <TR>
                    {therapies.map((therapy) => (
                      <Fragment key={therapy.id}>
                        <TH className="border-l border-slate-200 text-center">No.</TH>
                        <TH className="text-center">Última</TH>
                      </Fragment>
                    ))}
                  </TR>
                </THead>
                <TBody>
                  {summary.rows.map((row) => {
                    const total = row.cells.reduce((acc, cell) => acc + cell.sessions, 0);
                    return (
                      <TR key={row.student.id} className="hover:bg-slate-50/60">
                        <TD>
                          <Link
                            href={`/students/${row.student.id}`}
                            className="font-medium text-slate-900 hover:text-brand-700"
                          >
                            {row.student.lastName}, {row.student.firstName}
                          </Link>
                          <p className="text-xs text-slate-400">{row.student.documentId}</p>
                        </TD>
                        <TD className="whitespace-nowrap">{row.student.course?.name ?? "—"}</TD>
                        {row.cells.map((cell) => (
                          <Fragment key={cell.therapyId}>
                            <TD className="border-l border-slate-100 text-center">
                              <span className={cell.sessions > 0 ? "font-semibold text-slate-900" : "text-slate-300"}>
                                {cell.sessions || "—"}
                              </span>
                              <div className="mt-0.5">
                                {cell.assigned ? (
                                  <Badge
                                    tone="blue"
                                    title={cell.therapistName ? `Terapeuta: ${cell.therapistName}` : "Terapia asignada"}
                                  >
                                    Asignada
                                  </Badge>
                                ) : cell.sessions > 0 ? (
                                  <Badge tone="amber">Sin asignación</Badge>
                                ) : (
                                  <span className="text-[10px] text-slate-300">Sin asignar</span>
                                )}
                              </div>
                            </TD>
                            <TD className="whitespace-nowrap text-center text-xs">{formatDate(cell.lastDate)}</TD>
                          </Fragment>
                        ))}
                        <TD className="border-l border-slate-200 text-center font-semibold text-slate-900">
                          {total}
                        </TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </TableWrap>
            <div className="flex flex-wrap items-center justify-between gap-2 px-5 pb-4 text-xs text-slate-500">
              <p>
                Rango: {formatDate(from)} a {formatDate(to)} · No. = sesiones registradas · Última = fecha de la última
                sesión.
              </p>
              <p className="font-medium text-slate-600">
                Totales por terapia:{" "}
                {therapies
                  .map((therapy, index) => `${therapy.nameEs} ${totalByTherapy[index]}`)
                  .join(" · ")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
