import Link from "next/link";
import { Prisma } from "@prisma/client";
import { Plus, Search, Users } from "lucide-react";
import { requireUser, getCourseScope, studentScopeWhere } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { calculateAge, formatDate } from "@/lib/dates";
import { PAGE_SIZE } from "@/lib/constants";
import { studentSelect } from "@/lib/dto";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, TBody, TD, TH, THead, TR, Pagination } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Estudiantes" };

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; course?: string; status?: string; page?: string }>;
}) {
  const user = await requireUser();
  const scope = await getCourseScope(user);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const courseId = params.course ?? "";
  const status = params.status ?? "active";
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const showDiagnosis = can(user.role, "students.viewDiagnosis");

  const where: Prisma.StudentWhereInput = {
    ...studentScopeWhere(scope),
    ...(courseId ? { courseId } : {}),
    ...(status === "active" ? { active: true } : status === "inactive" ? { active: false } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q } },
            { lastName: { contains: q } },
            { documentId: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, students, courses] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: studentSelect(showDiagnosis),
    }),
    prisma.course.findMany({
      where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (target: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (courseId) query.set("course", courseId);
    if (status) query.set("status", status);
    query.set("page", String(target));
    return `/students?${query.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Estudiantes"
        description={`${total} estudiante(s) ${status === "all" ? "en total" : status === "inactive" ? "inactivo(s)" : "activo(s)"}${scope === null ? "" : " en tus cursos"}.`}
        actions={
          can(user.role, "students.write") ? (
            <Link href="/students/new">
              <Button>
                <Plus className="size-4" /> Nuevo estudiante
              </Button>
            </Link>
          ) : null
        }
      />

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input id="q" name="q" defaultValue={q} placeholder="Nombre, apellido o documento" className="pl-9" />
            </div>
          </div>
          <div className="sm:w-52">
            <label htmlFor="course" className="mb-1 block text-xs font-medium text-slate-600">
              Curso
            </label>
            <Select id="course" name="course" defaultValue={courseId}>
              <option value="">Todos los cursos</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="sm:w-40">
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
              Estado
            </label>
            <Select id="status" name="status" defaultValue={status}>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
              <option value="all">Todos</option>
            </Select>
          </div>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
          {q || courseId || status !== "active" ? (
            <Link href="/students" className="pb-2.5 text-xs text-brand-700 hover:underline">
              Limpiar
            </Link>
          ) : null}
        </form>
      </Card>

      {students.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Users className="size-10" />}
            title="Sin estudiantes"
            description="No encontramos estudiantes con los filtros actuales."
            action={
              can(user.role, "students.write") ? (
                <Link href="/students/new">
                  <Button size="sm">Registrar el primero</Button>
                </Link>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Estudiante</TH>
                  <TH>Documento</TH>
                  <TH>Curso</TH>
                  <TH>Edad</TH>
                  <TH>Acudiente</TH>
                  <TH>Estado</TH>
                  {showDiagnosis ? <TH>Diagnóstico</TH> : null}
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {students.map((student) => {
                  const age = calculateAge(student.birthDate);
                  const diagnosis = "diagnosis" in student ? (student as { diagnosis: string | null }).diagnosis : null;
                  return (
                    <TR key={student.id} className="hover:bg-slate-50/60">
                      <TD>
                        <Link href={`/students/${student.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                          {student.lastName}, {student.firstName}
                        </Link>
                        <p className="text-xs text-slate-400">Nac. {formatDate(student.birthDate)}</p>
                      </TD>
                      <TD className="font-mono text-xs">{student.documentId}</TD>
                      <TD>{student.course?.name ?? "—"}</TD>
                      <TD>{age === null ? "—" : `${age} años`}</TD>
                      <TD>
                        <p className="max-w-40 truncate">{student.guardianName ?? "—"}</p>
                        {student.guardianPhone ? <p className="text-xs text-slate-400">{student.guardianPhone}</p> : null}
                      </TD>
                      <TD>
                        {student.active ? <Badge tone="green">Activo</Badge> : <Badge tone="slate">Inactivo</Badge>}
                      </TD>
                      {showDiagnosis ? (
                        <TD>
                          {diagnosis ? (
                            <Badge tone="amber" title={diagnosis}>
                              Registrado
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TD>
                      ) : null}
                      <TD>
                        <div className="flex justify-end gap-2">
                          <Link href={`/students/${student.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                            Ver
                          </Link>
                          {can(user.role, "students.write") ? (
                            <Link href={`/students/${student.id}/edit`} className="text-xs font-medium text-slate-500 hover:underline">
                              Editar
                            </Link>
                          ) : null}
                        </div>
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </TableWrap>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
