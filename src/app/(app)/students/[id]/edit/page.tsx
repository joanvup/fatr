import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCourseScope, requirePermission, studentScopeWhere } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { StudentForm } from "@/components/students/student-form";
import { STUDENT_PRIVATE_SELECT } from "@/lib/dto";

export const metadata = { title: "Editar estudiante" };

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requirePermission("students.write");
  const scope = await getCourseScope(user);

  const [student, courses] = await Promise.all([
    prisma.student.findFirst({
      where: { id, ...studentScopeWhere(scope) },
      select: STUDENT_PRIVATE_SELECT,
    }),
    prisma.course.findMany({
      where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  if (!student) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title={`Editar · ${student.firstName} ${student.lastName}`}
        eyebrow="Estudiantes"
        actions={
          <Link href={`/students/${id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" /> Volver al perfil
            </Button>
          </Link>
        }
      />
      <StudentForm mode="edit" student={student} courses={courses} canSeeDiagnosis />
    </div>
  );
}
