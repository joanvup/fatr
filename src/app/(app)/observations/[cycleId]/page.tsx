import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCourseScope, requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { OBSERVATION_STATUS_LABELS } from "@/lib/constants";
import { Badge } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ObservationGrid, type GridRow } from "@/components/observations/observation-grid";

export const metadata = { title: "Grilla de observaciones F22" };

export default async function ObservationCyclePage({ params }: { params: Promise<{ cycleId: string }> }) {
  const { cycleId } = await params;
  const user = await requireUser();
  const scope = await getCourseScope(user);

  const cycle = await prisma.observationCycle.findUnique({
    where: { id: cycleId },
    include: { course: { select: { id: true, name: true, grade: true } } },
  });
  if (!cycle) notFound();
  if (scope !== null && !scope.includes(cycle.courseId)) notFound();

  const [domains, students] = await Promise.all([
    prisma.domain.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.student.findMany({
      where: {
        courseId: cycle.courseId,
        OR: [{ active: true }, { observations: { some: { cycleId } } }],
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentId: true,
        observations: {
          where: { cycleId },
          select: {
            id: true,
            observationDate: true,
            parentMeetingDate: true,
            parentAttended: true,
            studentMeetingDate: true,
            diagnosisNote: true,
            nextFollowUpDate: true,
            scores: { select: { domainId: true, level: true, note: true } },
          },
        },
      },
    }),
  ]);

  const rows: GridRow[] = students.map((student) => {
    const observation = student.observations[0];
    return {
      studentId: student.id,
      firstName: student.firstName,
      lastName: student.lastName,
      documentId: student.documentId,
      observationId: observation?.id ?? null,
      observationDate: observation?.observationDate ?? "",
      parentMeetingDate: observation?.parentMeetingDate ?? "",
      parentAttended: observation?.parentAttended ?? false,
      studentMeetingDate: observation?.studentMeetingDate ?? "",
      diagnosisNote: observation?.diagnosisNote ?? "",
      nextFollowUpDate: observation?.nextFollowUpDate ?? "",
      scores: observation?.scores.map((score) => ({
        domainId: score.domainId,
        level: score.level,
        note: score.note ?? "",
      })) ?? [],
    };
  });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<span className="text-xs text-slate-400">Observaciones F22 / {cycle.course.name}</span>}
        title={`${cycle.label ?? `Periodo ${cycle.period}`} · ${cycle.year}`}
        description={`${cycle.course.name} · ${formatDate(cycle.dateFrom)} a ${formatDate(cycle.dateTo)} · ${students.length} estudiante(s)`}
        actions={
          <>
            <Badge tone={cycle.status === "FINAL" ? "green" : "amber"}>{OBSERVATION_STATUS_LABELS[cycle.status]}</Badge>
            <Link href="/observations">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4" /> Volver
              </Button>
            </Link>
          </>
        }
      />

      {students.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-6 py-14 text-center text-sm text-slate-500">
          Este curso aún no tiene estudiantes activos. Agrega estudiantes para diligenciar la grilla.
        </div>
      ) : (
        <ObservationGrid
          cycleId={cycle.id}
          domains={domains.map((domain) => ({
            id: domain.id,
            nameEs: domain.nameEs,
            nameEn: domain.nameEn,
            sortOrder: domain.sortOrder,
          }))}
          initialRows={rows}
          status={cycle.status}
          canFinalize={can(user.role, "observations.finalize")}
          canEditDiagnosis={can(user.role, "students.viewDiagnosis")}
        />
      )}
    </div>
  );
}
