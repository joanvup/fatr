import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { getCourseScope, requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { CourseForm } from "@/components/courses/course-form";

export const metadata = { title: "Cursos" };

export default async function CoursesPage() {
  const user = await requireUser();
  const scope = await getCourseScope(user);
  const settings = await getSettings();
  const year = Number(settings["school.year"] ?? new Date().getFullYear());

  const courses = await prisma.course.findMany({
    where: scope ? { id: { in: scope } } : {},
    orderBy: [{ year: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { students: true, cycles: true, userLinks: true } },
    },
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Cursos"
        description="Cursos, roster y personal asignado. Los docentes y terapeutas solo ven los cursos que tienen asignados."
      />

      {courses.length === 0 ? (
        <Card>
          <EmptyState icon={<GraduationCap className="size-10" />} title="Sin cursos" description="Crea el primer curso para comenzar." />
        </Card>
      ) : (
        <TableWrap>
          <Table>
            <THead>
              <TR>
                <TH>Curso</TH>
                <TH>Grado</TH>
                <TH>Año</TH>
                <TH>Estudiantes</TH>
                <TH>Ciclos F22</TH>
                <TH>Personal</TH>
                <TH>Estado</TH>
                <TH className="text-right">Acciones</TH>
              </TR>
            </THead>
            <TBody>
              {courses.map((course) => (
                <TR key={course.id} className="hover:bg-slate-50/60">
                  <TD>
                    <Link href={`/courses/${course.id}`} className="font-medium text-slate-900 hover:text-brand-700">
                      {course.name}
                    </Link>
                  </TD>
                  <TD>{course.grade}</TD>
                  <TD>{course.year}</TD>
                  <TD>{course._count.students}</TD>
                  <TD>{course._count.cycles}</TD>
                  <TD>{course._count.userLinks}</TD>
                  <TD>{course.active ? <Badge tone="green">Activo</Badge> : <Badge tone="slate">Inactivo</Badge>}</TD>
                  <TD className="text-right">
                    <Link href={`/courses/${course.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                      Gestionar
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </TableWrap>
      )}

      {can(user.role, "courses.write") ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo curso</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm mode="create" year={year} />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
