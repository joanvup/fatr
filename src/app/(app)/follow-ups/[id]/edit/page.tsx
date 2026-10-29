import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCourseScope, requireUser, studentScopeWhere } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { todayIso } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { FollowUpForm } from "@/components/follow-ups/follow-up-form";

export const metadata = { title: "Editar seguimiento (F23)" };

export default async function EditFollowUpPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser();
  if (!can(user.role, "followUps.write")) notFound();

  const scope = await getCourseScope(user);
  const followUp = await prisma.followUp.findFirst({
    where: { id, student: studentScopeWhere(scope) },
    select: {
      id: true,
      studentId: true,
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
          firstName: true,
          lastName: true,
          documentId: true,
          course: { select: { name: true } },
        },
      },
    },
  });

  if (!followUp) notFound();

  const studentOption = {
    id: followUp.studentId,
    name: `${followUp.student.lastName}, ${followUp.student.firstName}`,
    documentId: followUp.student.documentId,
    courseName: followUp.student.course?.name ?? "Sin curso",
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Formato PM-04-F23"
        title="Editar seguimiento"
        description="Los cambios se reflejan en el documento y en el PDF oficial."
        actions={
          <Link href={`/follow-ups/${followUp.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" /> Volver
            </Button>
          </Link>
        }
      />

      <FollowUpForm
        mode="edit"
        followUp={followUp}
        students={[studentOption]}
        defaultResponsible={followUp.responsibleName}
        defaultCycle={followUp.cycleLabel ?? ""}
        today={todayIso()}
      />
    </div>
  );
}
