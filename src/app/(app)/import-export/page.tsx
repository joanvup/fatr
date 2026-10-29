import Link from "next/link";
import { notFound } from "next/navigation";
import { Download, FileSpreadsheet, Info } from "lucide-react";
import { getCourseScope, requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { startOfMonthIso, todayIso } from "@/lib/dates";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { ImportPanel } from "@/components/import-export/import-panel";

export const metadata = { title: "Datos y reportes" };

const TEMPLATE_LINKS = [
  {
    kind: "students",
    title: "Estudiantes",
    description: "Alta o actualización masiva por número de documento. El curso debe existir previamente.",
    href: "/api/templates/students",
  },
  {
    kind: "therapies",
    title: "Asignación de terapias",
    description: "Asigna terapias o áreas de apoyo a estudiantes existentes e indica el terapeuta responsable.",
    href: "/api/templates/therapies",
  },
  {
    kind: "attendance",
    title: "Asistencia",
    description: "Carga sesiones con fecha, horario y profesional. Las sesiones repetidas se actualizan.",
    href: "/api/templates/attendance",
  },
];

export default async function ImportExportPage() {
  const user = await requireUser();
  if (!can(user.role, "data.export")) notFound();

  const canImport = can(user.role, "data.import");
  const scope = await getCourseScope(user);
  const today = todayIso();
  const monthStart = startOfMonthIso(today);

  const [courses, cycles] = await Promise.all([
    prisma.course.findMany({
      where: { active: true, ...(scope ? { id: { in: scope } } : {}) },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.observationCycle.findMany({
      where: scope ? { courseId: { in: scope } } : {},
      orderBy: [{ year: "desc" }, { period: "desc" }],
      take: 8,
      select: {
        id: true,
        year: true,
        period: true,
        label: true,
        course: { select: { name: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Datos y reportes"
        description="Descarga la información en Excel, genera plantillas para cargas masivas y consulta los formatos institucionales en PDF."
        actions={
          <Badge tone="blue">
            <FileSpreadsheet className="size-3" /> Excel
          </Badge>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estudiantes</CardTitle>
            <p className="text-xs text-slate-500">
              Datos de contacto, curso, estado y diagnóstico clínico cuando tu rol lo permite.
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/api/export/students">
              <Button variant="outline">
                <Download className="size-4" /> Exportar estudiantes
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seguimientos F23</CardTitle>
            <p className="text-xs text-slate-500">
              Historial completo con fechas, responsable y los cuatro bloques de texto de cada seguimiento.
            </p>
          </CardHeader>
          <CardContent>
            <Link href="/api/export/followups">
              <Button variant="outline">
                <Download className="size-4" /> Exportar seguimientos
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Asistencia F25</CardTitle>
            <p className="text-xs text-slate-500">Sesiones registradas en el rango de fechas seleccionado.</p>
          </CardHeader>
          <CardContent>
            <form method="get" action="/api/export/attendance" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Desde" htmlFor="attendance-from">
                  <Input id="attendance-from" name="from" type="date" defaultValue={monthStart} />
                </Field>
                <Field label="Hasta" htmlFor="attendance-to">
                  <Input id="attendance-to" name="to" type="date" defaultValue={today} />
                </Field>
              </div>
              <Field label="Curso" htmlFor="attendance-course">
                <Select id="attendance-course" name="courseId" defaultValue="">
                  <option value="">Todos los cursos disponibles</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" variant="outline">
                <Download className="size-4" /> Exportar asistencia
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Relación de atención F24</CardTitle>
            <p className="text-xs text-slate-500">
              Terapias asignadas, sesiones realizadas y última fecha por estudiante en el rango elegido.
            </p>
          </CardHeader>
          <CardContent>
            <form method="get" action="/api/export/attention" className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Desde" htmlFor="attention-from">
                  <Input id="attention-from" name="from" type="date" defaultValue={monthStart} />
                </Field>
                <Field label="Hasta" htmlFor="attention-to">
                  <Input id="attention-to" name="to" type="date" defaultValue={today} />
                </Field>
              </div>
              <Field label="Curso" htmlFor="attention-course">
                <Select id="attention-course" name="courseId" defaultValue="">
                  <option value="">Todos los cursos disponibles</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Button type="submit" variant="outline">
                <Download className="size-4" /> Exportar relación de atención
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Observaciones F22 por ciclo</CardTitle>
          <p className="text-xs text-slate-500">
            Exporta la grilla de un periodo con los niveles, notas, fechas y diagnóstico de remisión de cada estudiante.
          </p>
        </CardHeader>
        <CardContent>
          {cycles.length === 0 ? (
            <EmptyState
              icon={<FileSpreadsheet className="size-8" />}
              title="Sin ciclos de observación"
              description="Crea un ciclo desde el módulo de Observaciones para poder exportarlo."
              action={
                <Link href="/observations">
                  <Button variant="outline" size="sm">
                    Ir a observaciones
                  </Button>
                </Link>
              }
            />
          ) : (
            <ul className="divide-y divide-slate-100">
              {cycles.map((cycle) => (
                <li key={cycle.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {cycle.course.name} · {cycle.label ?? `Periodo ${cycle.period}`} · {cycle.year}
                    </p>
                    <p className="text-xs text-slate-500">Formato PM-04-F22</p>
                  </div>
                  <Link href={`/api/export/observations?cycleId=${cycle.id}`} className="shrink-0">
                    <Button variant="ghost" size="sm">
                      <Download className="size-4" /> Excel
                    </Button>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canImport ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Plantillas de importación</CardTitle>
              <p className="text-xs text-slate-500">
                No cambies los encabezados de la primera fila. Las celdas marcadas como opcionales pueden quedar vacías.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-3">
                {TEMPLATE_LINKS.map((template) => (
                  <div key={template.kind} className="flex flex-col gap-2 rounded-lg border border-slate-100 p-3">
                    <p className="text-sm font-medium text-slate-800">{template.title}</p>
                    <p className="flex-1 text-xs text-slate-500">{template.description}</p>
                    <Link href={template.href}>
                      <Button variant="outline" size="sm">
                        <Download className="size-4" /> Descargar plantilla
                      </Button>
                    </Link>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <ImportPanel />
        </>
      ) : (
        <Card className="flex items-start gap-3 px-5 py-4 text-sm text-slate-600">
          <Info className="mt-0.5 size-4 shrink-0 text-slate-400" />
          <p>
            Tu rol puede exportar información, pero no importar archivos. Solicita a administración o coordinación
            académica las cargas masivas de estudiantes, terapias o asistencia.
          </p>
        </Card>
      )}
    </div>
  );
}
