import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCourseScope, requireUser, studentScopeWhere } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FollowUpForm } from "@/components/follow-ups/follow-up-form";

export const metadata = { title: "Nuevo seguimiento (F23)" };

export default async function NewFollowUpPage({
  searchParams,
}: {
  searchParams: Promise<{ studentId?: string }>;
}) {
  const user = await requireUser();
  if (!can(user.role, "followUps.write")) notFound();

  const params = await searchParams;
  const scope = await getCourseScope(user);
  const settings = await getSettings();

  const students = await prisma.student.findMany({
    where: { active: true, ...studentScopeWhere(scope) },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      firstName: true,
      lastName: true,
      documentId: true,
      course: { select: { name: true } },
    },
  });

  const options = students.map((student) => ({
    id: student.id,
    name: `${student.lastName}, ${student.firstName}`,
    documentId: student.documentId,
    courseName: student.course?.name ?? "Sin curso",
  }));

  const defaultStudentId = options.some((option) => option.id === params.studentId)
    ? params.studentId
    : undefined;
  const year = settings["school.year"] ?? String(new Date().getFullYear());

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Formato PM-04-F23"
        title="Nuevo seguimiento"
        description="Registra el estado inicial, las estrategias, los alcances y el plan de continuidad del estudiante."
        actions={
          <Link href="/follow-ups">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" /> Volver
            </Button>
          </Link>
        }
      />

      {options.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          No hay estudiantes activos en tus cursos. Asigna primero un curso a los estudiantes.
        </div>
      ) : (
        <FollowUpForm
          mode="create"
          students={options}
          defaultStudentId={defaultStudentId}
          defaultResponsible={user.name}
          defaultCycle={`${year}-1`}
          today={todayIso()}
        />
      )}
    </div>
  );
}
