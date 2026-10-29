import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, FileDown, Lock, Pencil, ShieldAlert } from "lucide-react";
import { getCourseScope, requireUser, studentScopeWhere } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { calculateAge, formatDate } from "@/lib/dates";
import { FOLLOW_UP_STATUS_LABELS } from "@/lib/constants";
import { formMeta, getSettings, institutionName } from "@/lib/settings";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/ui/form-buttons";
import { setFollowUpStatusAction } from "@/server/actions/followUps";

export const metadata = { title: "Seguimiento (F23)" };

function DataItem({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-800">{value || "—"}</dd>
    </div>
  );
}

function Block({ title, text }: { title: string; text: string | null }) {
  return (
    <section className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="min-h-20 whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50/50 px-4 py-3 text-sm leading-relaxed text-slate-700">
        {text || <span className="text-slate-400">Sin registrar.</span>}
      </div>
    </section>
  );
}

export default async function FollowUpDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireUser();
  if (!can(user.role, "followUps.read")) notFound();

  const scope = await getCourseScope(user);
  const [followUp, settings] = await Promise.all([
    prisma.followUp.findFirst({
      where: { id, student: studentScopeWhere(scope) },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentId: true,
            birthDate: true,
            grade: true,
            course: { select: { name: true } },
          },
        },
        createdBy: { select: { name: true } },
      },
    }),
    getSettings(),
  ]);

  if (!followUp) notFound();

  const meta = formMeta(settings, "f23");
  const student = followUp.student;
  const age = calculateAge(student.birthDate, followUp.realizationDate);
  const canWrite = can(user.role, "followUps.write");
  const isFinal = followUp.status === "FINAL";

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Formato PM-04-F23"
        title={`Seguimiento · ${student.firstName} ${student.lastName}`}
        description={`${followUp.cycleLabel ?? "Sin ciclo"} · Seguimiento del ${formatDate(followUp.followUpDate)} · ${FOLLOW_UP_STATUS_LABELS[followUp.status] ?? followUp.status}`}
        actions={
          <>
            <Link href="/follow-ups">
              <Button variant="outline" size="sm">
                <ArrowLeft className="size-4" /> Volver
              </Button>
            </Link>
            <Link href={`/api/pdf/f23?id=${followUp.id}`} target="_blank">
              <Button variant="outline" size="sm">
                <FileDown className="size-4" /> PDF oficial
              </Button>
            </Link>
            {canWrite ? (
              <Link href={`/follow-ups/${followUp.id}/edit`}>
                <Button variant="outline" size="sm">
                  <Pencil className="size-4" /> Editar
                </Button>
              </Link>
            ) : null}
            {canWrite ? (
              <form action={setFollowUpStatusAction}>
                <input type="hidden" name="id" value={followUp.id} />
                <input type="hidden" name="status" value={isFinal ? "DRAFT" : "FINAL"} />
                <ConfirmSubmitButton
                  variant={isFinal ? "outline" : "default"}
                  message={isFinal ? "¿Reabrir el seguimiento como borrador?" : "¿Cerrar el seguimiento? Podrás reabrirlo si es necesario."}
                >
                  {isFinal ? (
                    <>
                      <Lock className="size-4" /> Reabrir
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="size-4" /> Cerrar seguimiento
                    </>
                  )}
                </ConfirmSubmitButton>
              </form>
            ) : null}
          </>
        }
      />

      {query.created ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Seguimiento registrado correctamente.
        </div>
      ) : null}
      {query.updated ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Cambios guardados correctamente.
        </div>
      ) : null}

      <Card className="mx-auto max-w-4xl overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold tracking-wide text-slate-900">{institutionName(settings)}</p>
            <p className="text-sm font-medium text-slate-700">Registro seguimiento por estudiante</p>
            <p className="text-xs italic text-slate-500">Follow-up record by student</p>
          </div>
          <div className="text-left text-xs text-slate-500 sm:text-right">
            <p className="font-medium text-slate-700">{meta.code}</p>
            <p>Versión {meta.version}</p>
            <p>Vigencia {meta.validity}</p>
          </div>
        </div>

        <CardContent className="space-y-6 px-6 py-5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={isFinal ? "green" : "amber"}>{FOLLOW_UP_STATUS_LABELS[followUp.status] ?? followUp.status}</Badge>
            <Badge tone="slate">Ciclo {followUp.cycleLabel ?? "—"}</Badge>
            <span className="text-xs text-slate-400">Registrado por {followUp.createdBy.name}</span>
          </div>

          <dl className="grid gap-4 sm:grid-cols-3">
            <DataItem label="Estudiante" value={`${student.lastName}, ${student.firstName}`} />
            <DataItem label="Documento" value={student.documentId} />
            <DataItem label="Curso / grado" value={`${student.course?.name ?? "Sin curso"} · ${student.grade}`} />
            <DataItem label="Edad a la realización" value={age === null ? "—" : `${age} años`} />
            <DataItem label="Fecha de inicio" value={formatDate(followUp.startDate)} />
            <DataItem label="Fecha de seguimiento" value={formatDate(followUp.followUpDate)} />
            <DataItem label="Fecha de realización" value={formatDate(followUp.realizationDate)} />
          </dl>

          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-amber-800">
              <ShieldAlert className="size-4" /> Diagnóstico <span className="font-normal normal-case">(uso exclusivo terapeuta / orientadora escolar)</span>
            </p>
            <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">
              {followUp.diagnosisSnapshot || "Sin diagnóstico registrado al crear el seguimiento."}
            </p>
          </div>

          <Block title="Estado inicial" text={followUp.descriptionInitial} />
          <Block title="Técnicas y estrategias" text={followUp.strategies} />
          <Block title="Alcances" text={followUp.achievements} />
          <Block title="Seguimiento" text={followUp.followUpNotes} />

          <div className="grid gap-6 border-t border-slate-200 pt-5 sm:grid-cols-3">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Responsable</p>
              <p className="text-sm font-medium text-slate-800">{followUp.responsibleName}</p>
              <div className="mt-8 border-t border-slate-400 pt-1 text-[11px] text-slate-500">Firma</div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Área</p>
              <p className="text-sm text-slate-700">{followUp.workArea || "—"}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Orientadora escolar</p>
              <p className="text-sm text-slate-700">{followUp.counselorName || "—"}</p>
              <div className="mt-8 border-t border-slate-400 pt-1 text-[11px] text-slate-500">Firma</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
