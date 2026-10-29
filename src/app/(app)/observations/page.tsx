import Link from "next/link";
import { ClipboardList, FileDown } from "lucide-react";
import { getCourseScope, requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDate, todayIso, addDaysIso, startOfMonthIso } from "@/lib/dates";
import { getSettings } from "@/lib/settings";
import { OBSERVATION_STATUS_LABELS } from "@/lib/constants";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { CycleForm } from "@/components/observations/cycle-form";
import { cn } from "@/lib/utils";

export const metadata = { title: "Observaciones por curso (F22)" };

export default async function ObservationsPage() {
  const user = await requireUser();
  const scope = await getCourseScope(user);
  const settings = await getSettings();
  const year = Number(settings["school.year"] ?? new Date().getFullYear());

  const [cycles, courses, domainCount] = await Promise.all([
    prisma.observationCycle.findMany({
      where: scope ? { courseId: { in: scope } } : {},
      orderBy: [{ year: "desc" }, { period: "desc" }, { course: { name: "asc" } }],
      include: {
        course: { select: { id: true, name: true } },
        _count: { select: { observations: true } },
        observations: {
          select: {
            scores: { where: { level: { not: null } }, select: { id: true } },
          },
        },
      },
    }),
    prisma.course.findMany({
      where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.domain.count({ where: { active: true } }),
  ]);

  const studentCounts = await prisma.student.groupBy({
    by: ["courseId"],
    where: { active: true, courseId: { in: courses.map((course) => course.id) } },
    _count: { _all: true },
  });
  const studentCountMap = new Map(studentCounts.map((row) => [row.courseId, row._count._all]));

  const today = todayIso();

  return (
    <div className="space-y-5">
      <PageHeader
        title="Observaciones por curso"
        description="Formato PM-04-F22. Registra los dominios de observación por estudiante y periodo, las citas y el seguimiento proyectado."
        actions={
          <Link href="/import-export">
            <Button variant="outline" size="sm">
              <FileDown className="size-4" /> Exportar datos
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cycles.length === 0 ? (
          <Card className="md:col-span-2 xl:col-span-3">
            <EmptyState
              icon={<ClipboardList className="size-10" />}
              title="Aún no hay ciclos de observación"
              description="Crea un ciclo para cada curso y periodo. Los estudiantes activos se agregan automáticamente a la grilla."
            />
          </Card>
        ) : (
          cycles.map((cycle) => {
            const expected = Math.max((studentCountMap.get(cycle.courseId) ?? 0) * domainCount, 1);
            const completed = Math.min(
              cycle.observations.reduce((acc, observation) => acc + observation.scores.length, 0),
              expected,
            );
            const percent = Math.round((completed / expected) * 100);
            return (
              <Card key={cycle.id} className="flex flex-col">
                <CardHeader className="flex-row items-start justify-between gap-2">
                  <div>
                    <CardTitle>{cycle.course.name}</CardTitle>
                    <p className="text-xs text-slate-500">
                      {cycle.label ?? `Periodo ${cycle.period}`} · {cycle.year}
                    </p>
                  </div>
                  <Badge tone={cycle.status === "FINAL" ? "green" : "amber"}>
                    {OBSERVATION_STATUS_LABELS[cycle.status]}
                  </Badge>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-between gap-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Avance</span>
                      <span>
                        {completed}/{expected} · {percent}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div className={cn("h-full rounded-full", percent === 100 ? "bg-emerald-500" : "bg-brand-600")} style={{ width: `${percent}%` }} />
                    </div>
                    <p className="pt-1 text-xs text-slate-400">
                      {formatDate(cycle.dateFrom)} a {formatDate(cycle.dateTo)} · {cycle._count.observations} estudiante(s)
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/observations/${cycle.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        {cycle.status === "FINAL" ? "Ver grilla" : "Continuar"}
                      </Button>
                    </Link>
                    <Link href={`/api/pdf/f22?cycleId=${cycle.id}`} target="_blank">
                      <Button variant="ghost" size="sm" title="PDF oficial">
                        <FileDown className="size-4" /> PDF
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {can(user.role, "observations.write") && courses.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nuevo ciclo de observación</CardTitle>
            <p className="text-xs text-slate-500">Un ciclo agrupa a todos los estudiantes activos del curso para un periodo.</p>
          </CardHeader>
          <CardContent>
            <CycleForm
              courses={courses}
              year={year}
              defaultFrom={startOfMonthIso(today)}
              defaultTo={addDaysIso(today, 30)}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
