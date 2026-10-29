import { requirePermission, getCourseScope } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { StudentForm } from "@/components/students/student-form";
import { can } from "@/lib/permissions";

export const metadata = { title: "Nuevo estudiante" };

export default async function NewStudentPage() {
  const user = await requirePermission("students.write");
  const scope = await getCourseScope(user);
  const courses = await prisma.course.findMany({
    where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader title="Nuevo estudiante" description="Registra los datos básicos, el acudiente y, si aplica, el diagnóstico clínico." />
      <StudentForm mode="create" courses={courses} canSeeDiagnosis={can(user.role, "students.viewDiagnosis")} />
    </div>
  );
}
