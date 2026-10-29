import Link from "next/link";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CalendarClock,
  ClipboardList,
  FileText,
  TrendingDown,
  TrendingUp,
  UserX,
  Users,
} from "lucide-react";
import { requireUser, getCourseScope } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { getDashboardData } from "@/lib/metrics";
import { formatDate } from "@/lib/dates";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { AttendanceTrendChart, TherapyBarChart } from "@/components/dashboard/charts";
import { ROLE_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export const metadata = { title: "Panel" };

function KpiCard({
  label,
  value,
  hint,
  icon,
  tone = "brand",
}: {
  label: string;
  value: string | number;
  hint?: React.ReactNode;
  icon: React.ReactNode;
  tone?: "brand" | "emerald" | "amber" | "violet";
}) {
  const tones = {
    brand: "bg-brand-50 text-brand-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    violet: "bg-violet-50 text-violet-700",
  };
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
          {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
        </div>
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", tones[tone])}>{icon}</span>
      </div>
    </Card>
  );
}

export default async function DashboardPage() {
  const user = await requireUser();
  const scope = await getCourseScope(user);
  const data = await getDashboardData(user, scope);
  const delta = data.sessionsPrev30 > 0 ? Math.round(((data.sessions30 - data.sessionsPrev30) / data.sessionsPrev30) * 100) : null;
  const avgProgress = data.observationProgress.length
    ? Math.round(data.observationProgress.reduce((acc, item) => acc + item.percent, 0) / data.observationProgress.length)
    : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Hola, ${user.name.split(" ")[0]}`}
        description={`Resumen de ${ROLE_LABELS[user.role].toLowerCase()} · ${scope === null ? "todos los cursos" : `${scope.length} curso(s) asignado(s)`}.`}
        actions={
          can(user.role, "observations.write") ? (
            <Link
              href="/observations"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-800 px-4 text-sm font-medium text-white shadow-sm hover:bg-brand-700"
            >
              <ClipboardList className="size-4" /> Ir a observaciones
            </Link>
          ) : null
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Estudiantes activos"
          value={data.activeStudents}
          hint={`${data.totalCourses} curso(s) en operación`}
          icon={<Users className="size-5" />}
        />
        <KpiCard
          label="Sesiones · últimos 30 días"
          value={data.sessions30}
          hint={
            delta === null ? (
              "Sin histórico previo"
            ) : (
              <span className={cn("inline-flex items-center gap-1", delta >= 0 ? "text-emerald-600" : "text-red-600")}>
                {delta >= 0 ? <TrendingUp className="size-3.5" /> : <TrendingDown className="size-3.5" />}
                {delta >= 0 ? "+" : ""}
                {delta}% frente a 30 días anteriores
              </span>
            )
          }
          icon={<Activity className="size-5" />}
          tone="emerald"
        />
        <KpiCard
          label="Avance observaciones F22"
          value={`${avgProgress}%`}
          hint={`${data.observationProgress.length} ciclo(s) de observación`}
          icon={<ClipboardList className="size-5" />}
          tone="violet"
        />
        <KpiCard
          label="Seguimientos pendientes"
          value={data.followUps.draft}
          hint={
            data.followUps.overdue > 0 ? (
              <span className="text-red-600">{data.followUps.overdue} vencido(s)</span>
            ) : (
              <span>{data.followUps.upcoming} próximo(s)</span>
            )
          }
          icon={<FileText className="size-5" />}
          tone="amber"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Asistencia por semana</CardTitle>
              <p className="text-xs text-slate-500">Sesiones registradas en las últimas 8 semanas</p>
            </div>
            <CalendarCheck className="size-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <AttendanceTrendChart data={data.trend} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sesiones por terapia</CardTitle>
            <p className="text-xs text-slate-500">Últimos 30 días</p>
          </CardHeader>
          <CardContent>
            {data.therapySessions.length ? (
              <TherapyBarChart data={data.therapySessions} />
            ) : (
              <EmptyState title="Aún no hay sesiones" description="Registra asistencia para ver la distribución por terapia." />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Avance F22</CardTitle>
            <Link href="/observations" className="text-xs font-medium text-brand-700 hover:underline">
              Ver todos
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.observationProgress.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Sin ciclos de observación.</p>
            ) : (
              data.observationProgress.map((item) => (
                <Link key={item.cycleId} href={`/observations/${item.cycleId}`} className="block group">
                  <div className="flex items-center justify-between text-sm">
                    <span className="truncate font-medium text-slate-700 group-hover:text-brand-700">{item.courseName}</span>
                    <span className="ml-2 shrink-0 text-xs text-slate-500">{item.percent}%</span>
                  </div>
                  <p className="mb-1.5 text-xs text-slate-400">{item.label}</p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-brand-600" style={{ width: `${item.percent}%` }} />
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Próximas citas de padres</CardTitle>
            <CalendarClock className="size-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-3">
            {data.parentMeetings.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No hay citas programadas.</p>
            ) : (
              data.parentMeetings.map((meeting) => (
                <div key={meeting.id} className="flex items-start justify-between gap-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{meeting.studentName}</p>
                    <p className="text-xs text-slate-500">{meeting.courseName}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-slate-700">{formatDate(meeting.date)}</p>
                    {meeting.attended === false ? <Badge tone="red">No asistió</Badge> : null}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Sin asistencia reciente</CardTitle>
            <UserX className="size-4 text-slate-400" />
          </CardHeader>
          <CardContent className="space-y-3">
            {data.withoutAttendance.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">Todos los estudiantes tienen sesiones recientes.</p>
            ) : (
              data.withoutAttendance.map((student) => (
                <Link key={student.id} href={`/students/${student.id}`} className="flex items-center justify-between gap-2 text-sm hover:text-brand-700">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-800">{student.name}</p>
                    <p className="text-xs text-slate-500">{student.courseName}</p>
                  </div>
                  <span className="shrink-0 text-xs text-slate-500">
                    {student.lastDate ? formatDate(student.lastDate) : "Sin sesiones"}
                  </span>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { href: "/attendance", label: "Registrar asistencia", icon: CalendarCheck },
          { href: "/follow-ups", label: "Nuevo seguimiento", icon: FileText },
          { href: "/attention", label: "Relación de atención", icon: Activity },
        ]
          .filter((action) =>
            action.href === "/follow-ups" ? can(user.role, "followUps.read") : can(user.role, "attendance.read"),
          )
          .map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition-colors hover:border-brand-300 hover:bg-brand-50/40"
            >
              <span className="flex items-center gap-3 text-sm font-medium text-slate-700 group-hover:text-brand-800">
                <action.icon className="size-4" /> {action.label}
              </span>
              <ArrowRight className="size-4 text-slate-400 group-hover:text-brand-700" />
            </Link>
          ))}
      </div>
    </div>
  );
}
