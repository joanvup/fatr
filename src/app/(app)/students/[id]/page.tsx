import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  CalendarCheck,
  ClipboardList,
  FileText,
  Mail,
  Pencil,
  Phone,
  ShieldAlert,
  UserRound,
  UserX,
} from "lucide-react";
import { getCourseScope, requireUser, studentScopeWhere } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { calculateAge, formatDate, formatDuration, todayIso } from "@/lib/dates";
import { LEVEL_LABELS, OBSERVATION_STATUS_LABELS, SEX_OPTIONS, FOLLOW_UP_STATUS_LABELS } from "@/lib/constants";
import { Badge, Card, CardContent, CardHeader, CardTitle, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { TherapyAssignForm } from "@/components/students/therapy-form";
import { removeTherapyAction, setStudentActiveAction } from "@/server/actions/students";
import { ConfirmSubmitButton } from "@/components/ui/form-buttons";
import { cn } from "@/lib/utils";

export const metadata = { title: "Perfil del estudiante" };

const TABS: { key: string; label: string; permission?: "followUps.read" }[] = [
  { key: "resumen", label: "Resumen" },
  { key: "observaciones", label: "Observaciones F22" },
  { key: "seguimientos", label: "Seguimientos F23", permission: "followUps.read" },
  { key: "terapias", label: "Terapias" },
  { key: "asistencia", label: "Asistencia F25" },
];

function InfoItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

export default async function StudentProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; created?: string; updated?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();
  const scope = await getCourseScope(user);
  const showDiagnosis = can(user.role, "students.viewDiagnosis");
  const canWrite = can(user.role, "students.write");

  const raw = await prisma.student.findFirst({
    where: { id, ...studentScopeWhere(scope) },
    include: {
      course: true,
      observations: {
        include: {
          cycle: { include: { course: { select: { name: true } } } },
          scores: { include: { domain: true } },
        },
      },
      therapies: {
        where: { active: true },
        include: { therapy: true, therapist: { select: { name: true } } },
      },
      attendances: {
        orderBy: [{ date: "desc" }, { startTime: "desc" }],
        take: 20,
        include: {
          therapy: { select: { nameEs: true } },
          signatures: { select: { id: true, role: true } },
        },
      },
    },
  });

  if (!raw) notFound();
  // El diagnóstico permanece en el servidor: nunca se pasa este objeto a un componente cliente.
  const student = raw;

  const [followUps, therapies, therapists] = await Promise.all([
    can(user.role, "followUps.read")
      ? prisma.followUp.findMany({
          where: { studentId: id },
          orderBy: { followUpDate: "desc" },
          select: {
            id: true,
            startDate: true,
            followUpDate: true,
            realizationDate: true,
            status: true,
            responsibleName: true,
            workArea: true,
          },
        })
      : Promise.resolve([]),
    prisma.therapy.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, nameEs: true } }),
    prisma.user.findMany({
      where: { role: "THERAPIST", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const age = calculateAge(student.birthDate);
  const sex = SEX_OPTIONS.find((option) => option.value === student.sex)?.label ?? student.sex;
  const activeTab = TABS.find((tab) => tab.key === query.tab)?.key ?? "resumen";
  const observations = [...student.observations].sort((a, b) =>
    `${b.cycle.year}-${b.cycle.period}`.localeCompare(`${a.cycle.year}-${a.cycle.period}`),
  );
  const latestFollowUp = followUps[0];

  const tabHref = (tab: string) => `/students/${id}?tab=${tab}`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow={<span className="text-xs text-slate-400">Estudiantes / {student.course?.name ?? "Sin curso"}</span>}
        title={`${student.firstName} ${student.lastName}`}
        description={`Documento ${student.documentId} · ${student.grade} · ${student.active ? "Activo" : "Inactivo"}`}
        actions={
          <>
            <Link href="/students">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4" /> Volver
              </Button>
            </Link>
            {can(user.role, "followUps.write") ? (
              <Link href={`/follow-ups/new?studentId=${id}`}>
                <Button variant="outline" size="sm">
                  <FileText className="size-4" /> Nuevo seguimiento
                </Button>
              </Link>
            ) : null}
            {can(user.role, "attendance.write") ? (
              <Link href={`/attendance?studentId=${id}`}>
                <Button variant="outline" size="sm">
                  <CalendarCheck className="size-4" /> Registrar sesión
                </Button>
              </Link>
            ) : null}
            {canWrite ? (
              <Link href={`/students/${id}/edit`}>
                <Button size="sm">
                  <Pencil className="size-4" /> Editar
                </Button>
              </Link>
            ) : null}
          </>
        }
      />

      {query.created ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Estudiante registrado correctamente.
        </div>
      ) : null}
      {query.updated ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Cambios guardados correctamente.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="size-4 text-slate-400" /> Datos generales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid gap-4 sm:grid-cols-3">
              <InfoItem label="Documento" value={student.documentId} />
              <InfoItem label="Fecha de nacimiento" value={formatDate(student.birthDate)} />
              <InfoItem label="Edad" value={age === null ? "—" : `${age} años`} />
              <InfoItem label="Sexo" value={sex} />
              <InfoItem label="Grado" value={student.grade} />
              <InfoItem label="Curso" value={student.course?.name} />
              <InfoItem label="Acudiente" value={student.guardianName} />
              <InfoItem
                label="Teléfono"
                value={
                  student.guardianPhone ? (
                    <a className="inline-flex items-center gap-1 hover:text-brand-700" href={`tel:${student.guardianPhone}`}>
                      <Phone className="size-3.5" /> {student.guardianPhone}
                    </a>
                  ) : null
                }
              />
              <InfoItem
                label="Correo"
                value={
                  student.guardianEmail ? (
                    <a className="inline-flex items-center gap-1 hover:text-brand-700" href={`mailto:${student.guardianEmail}`}>
                      <Mail className="size-3.5" /> <span className="truncate">{student.guardianEmail}</span>
                    </a>
                  ) : null
                }
              />
            </dl>
          </CardContent>
        </Card>

        {showDiagnosis ? (
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader className="border-amber-100">
              <CardTitle className="flex items-center gap-2 text-amber-900">
                <ShieldAlert className="size-4 text-amber-600" /> Diagnóstico clínico
              </CardTitle>
              <p className="text-xs text-amber-700">Uso exclusivo terapeuta / orientadora escolar.</p>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-slate-700">
                {student.diagnosis || "Sin diagnóstico registrado."}
              </p>
              {student.diagnosisUpdatedAt ? (
                <p className="mt-3 text-xs text-amber-700">Actualizado el {formatDate(student.diagnosisUpdatedAt.toISOString().slice(0, 10))}</p>
              ) : null}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="scroll-thin flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.filter((tab) => !tab.permission || can(user.role, tab.permission)).map((tab) => (
          <Link
            key={tab.key}
            href={tabHref(tab.key)}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              activeTab === tab.key
                ? "border-brand-700 text-brand-800"
                : "border-transparent text-slate-500 hover:text-slate-800",
            )}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {activeTab === "resumen" ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Observaciones F22</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{observations.length}</p>
              <p className="mt-1 text-xs text-slate-500">
                {observations[0] ? `Último: ${observations[0].cycle.label ?? `Periodo ${observations[0].cycle.period}`}` : "Sin registros"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Seguimientos F23</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{followUps.length}</p>
              <p className="mt-1 text-xs text-slate-500">
                {latestFollowUp ? `Último: ${formatDate(latestFollowUp.followUpDate)}` : "Sin seguimientos"}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Sesiones registradas</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-semibold">{student.attendances.length}</p>
              <p className="mt-1 text-xs text-slate-500">
                {student.attendances[0] ? `Última: ${formatDate(student.attendances[0].date)}` : "Sin sesiones"}
              </p>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Terapias activas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {student.therapies.length === 0 ? (
                <p className="text-sm text-slate-500">Sin terapias asignadas.</p>
              ) : (
                student.therapies.map((assignment) => (
                  <div key={assignment.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-slate-800">{assignment.therapy.nameEs}</p>
                      <p className="text-xs text-slate-500">
                        {assignment.therapist?.name ?? "Sin terapeuta"} · desde {formatDate(assignment.startDate)}
                      </p>
                    </div>
                    <Badge tone={assignment.therapy.kind === "THERAPY" ? "blue" : "slate"}>
                      {assignment.therapy.kind === "THERAPY" ? "Terapia" : "Apoyo"}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Estado del estudiante</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-600">
                {student.active ? "El estudiante está activo y aparece en los formatos." : "El estudiante está inactivo."}
              </p>
              {canWrite ? (
                <form action={setStudentActiveAction} className="mt-4">
                  <input type="hidden" name="id" value={student.id} />
                  <input type="hidden" name="active" value={student.active ? "false" : "true"} />
                  <ConfirmSubmitButton
                    variant={student.active ? "destructive" : "secondary"}
                    size="sm"
                    message={
                      student.active
                        ? "¿Marcar al estudiante como inactivo? Dejará de aparecer en los formatos."
                        : "¿Reactivar al estudiante?"
                    }
                  >
                    {student.active ? "Marcar como inactivo" : "Reactivar estudiante"}
                  </ConfirmSubmitButton>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {activeTab === "observaciones" ? (
        <div className="space-y-4">
          {observations.length === 0 ? (
            <Card>
              <EmptyState
                icon={<ClipboardList className="size-10" />}
                title="Sin observaciones registradas"
                description="Las observaciones se registran por curso y periodo desde el módulo F22."
              />
            </Card>
          ) : (
            observations.map((observation) => (
              <Card key={observation.id}>
                <CardHeader className="flex-row flex-wrap items-center justify-between gap-2">
                  <div>
                    <CardTitle>
                      {observation.cycle.label ?? `Periodo ${observation.cycle.period}`} · {observation.cycle.year}
                    </CardTitle>
                    <p className="text-xs text-slate-500">
                      {observation.cycle.course.name} · {formatDate(observation.cycle.dateFrom)} a {formatDate(observation.cycle.dateTo)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={observation.cycle.status === "FINAL" ? "green" : "amber"}>
                      {OBSERVATION_STATUS_LABELS[observation.cycle.status] ?? observation.cycle.status}
                    </Badge>
                    <Link href={`/observations/${observation.cycleId}`} className="text-xs font-medium text-brand-700 hover:underline">
                      Ver grilla
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {observation.scores.map((score) => (
                      <div key={score.id} className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2">
                        <p className="text-xs font-medium text-slate-600">{score.domain.nameEs.split(" (")[0]}</p>
                        <p className="mt-0.5 text-sm">
                          {score.level ? (
                            <span className="font-medium text-slate-900">
                              {score.level} · {LEVEL_LABELS[score.level]}
                            </span>
                          ) : (
                            <span className="text-slate-400">Sin nivel</span>
                          )}
                        </p>
                        {score.note ? <p className="mt-1 text-xs text-slate-500">{score.note}</p> : null}
                      </div>
                    ))}
                  </div>
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <InfoItem label="Fecha de observación" value={formatDate(observation.observationDate)} />
                    <InfoItem label="Cita con padres" value={formatDate(observation.parentMeetingDate)} />
                    <InfoItem label="Asistieron" value={observation.parentAttended ? "Sí" : "No"} />
                    <InfoItem label="Cita con estudiantes" value={formatDate(observation.studentMeetingDate)} />
                  </dl>
                  {observation.diagnosisNote ? (
                    <div className="rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                      <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Diagnóstico / remisión del periodo</p>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{observation.diagnosisNote}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : null}

      {activeTab === "seguimientos" ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Historial de seguimientos</CardTitle>
            {can(user.role, "followUps.write") ? (
              <Link href={`/follow-ups/new?studentId=${id}`} className="text-xs font-medium text-brand-700 hover:underline">
                Nuevo seguimiento
              </Link>
            ) : null}
          </CardHeader>
          {followUps.length === 0 ? (
            <EmptyState icon={<FileText className="size-10" />} title="Sin seguimientos" description="Crea el primer seguimiento F23 para este estudiante." />
          ) : (
            <TableWrap className="rounded-none border-0 shadow-none">
              <Table>
                <THead>
                  <TR>
                    <TH>Inicio</TH>
                    <TH>Seguimiento</TH>
                    <TH>Realización</TH>
                    <TH>Responsable</TH>
                    <TH>Área</TH>
                    <TH>Estado</TH>
                    <TH />
                  </TR>
                </THead>
                <TBody>
                  {followUps.map((followUp) => (
                    <TR key={followUp.id}>
                      <TD>{formatDate(followUp.startDate)}</TD>
                      <TD>{formatDate(followUp.followUpDate)}</TD>
                      <TD>{formatDate(followUp.realizationDate)}</TD>
                      <TD>{followUp.responsibleName}</TD>
                      <TD>{followUp.workArea ?? "—"}</TD>
                      <TD>
                        <Badge tone={followUp.status === "FINAL" ? "green" : "amber"}>
                          {FOLLOW_UP_STATUS_LABELS[followUp.status]}
                        </Badge>
                      </TD>
                      <TD className="text-right">
                        <Link href={`/follow-ups/${followUp.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                          Ver
                        </Link>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>
      ) : null}

      {activeTab === "terapias" ? (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Asignar terapia o área de apoyo</CardTitle>
            </CardHeader>
            <CardContent>
              {canWrite ? (
                <TherapyAssignForm
                  studentId={id}
                  therapies={therapies}
                  therapists={therapists}
                  defaultDate={todayIso()}
                />
              ) : (
                <p className="text-sm text-slate-500">Solo terapeutas, coordinación y administración pueden asignar terapias.</p>
              )}
            </CardContent>
          </Card>

          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Terapia / área</TH>
                  <TH>Tipo</TH>
                  <TH>Terapeuta</TH>
                  <TH>Inicio</TH>
                  <TH>Fin</TH>
                  <TH />
                </TR>
              </THead>
              <TBody>
                {student.therapies.length === 0 ? (
                  <TR>
                    <TD colSpan={6} className="py-8 text-center text-sm text-slate-500">
                      Sin terapias activas.
                    </TD>
                  </TR>
                ) : (
                  student.therapies.map((assignment) => (
                    <TR key={assignment.id}>
                      <TD className="font-medium text-slate-800">{assignment.therapy.nameEs}</TD>
                      <TD>
                        <Badge tone={assignment.therapy.kind === "THERAPY" ? "blue" : "slate"}>
                          {assignment.therapy.kind === "THERAPY" ? "Terapia" : "Área de apoyo"}
                        </Badge>
                      </TD>
                      <TD>{assignment.therapist?.name ?? "—"}</TD>
                      <TD>{formatDate(assignment.startDate)}</TD>
                      <TD>{formatDate(assignment.endDate)}</TD>
                      <TD className="text-right">
                        {canWrite ? (
                          <form action={removeTherapyAction}>
                            <input type="hidden" name="id" value={assignment.id} />
                            <ConfirmSubmitButton
                              variant="ghost"
                              size="sm"
                              message={`¿Finalizar la asignación de ${assignment.therapy.nameEs}?`}
                            >
                              Finalizar
                            </ConfirmSubmitButton>
                          </form>
                        ) : null}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </TableWrap>
        </div>
      ) : null}

      {activeTab === "asistencia" ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Últimas sesiones registradas</CardTitle>
            <Link href={`/attendance?studentId=${id}`} className="text-xs font-medium text-brand-700 hover:underline">
              Registrar sesión
            </Link>
          </CardHeader>
          {student.attendances.length === 0 ? (
            <EmptyState
              icon={<UserX className="size-10" />}
              title="Sin sesiones"
              description="El estudiante aún no tiene asistencias registradas en F25."
            />
          ) : (
            <TableWrap className="rounded-none border-0 shadow-none">
              <Table>
                <THead>
                  <TR>
                    <TH>Fecha</TH>
                    <TH>Terapia / área</TH>
                    <TH>Horario</TH>
                    <TH>Duración</TH>
                    <TH>Profesional</TH>
                    <TH>Firmas</TH>
                  </TR>
                </THead>
                <TBody>
                  {student.attendances.map((attendance) => (
                    <TR key={attendance.id}>
                      <TD>{formatDate(attendance.date)}</TD>
                      <TD>{attendance.therapy.nameEs}</TD>
                      <TD className="font-mono text-xs">
                        {attendance.startTime}–{attendance.endTime}
                      </TD>
                      <TD>{formatDuration(attendance.durationMinutes)}</TD>
                      <TD>{attendance.professionalName}</TD>
                      <TD>
                        <div className="flex gap-1">
                          {attendance.signatures.map((signature) => (
                            <Badge key={signature.id} tone="blue">
                              {signature.role === "PROFESSIONAL" ? "Prof." : "Acud."}
                            </Badge>
                          ))}
                          {attendance.signatures.length === 0 ? <span className="text-xs text-slate-400">Sin firma</span> : null}
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            </TableWrap>
          )}
        </Card>
      ) : null}

      {activeTab === "resumen" && latestFollowUp ? (
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Último seguimiento</CardTitle>
            <Link href={`/follow-ups/${latestFollowUp.id}`} className="text-xs font-medium text-brand-700 hover:underline">
              Ver documento
            </Link>
          </CardHeader>
          <CardContent className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <Activity className="size-3.5" /> {formatDate(latestFollowUp.followUpDate)}
            </span>
            <span>{latestFollowUp.responsibleName}</span>
            <Badge tone={latestFollowUp.status === "FINAL" ? "green" : "amber"}>
              {FOLLOW_UP_STATUS_LABELS[latestFollowUp.status]}
            </Badge>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
