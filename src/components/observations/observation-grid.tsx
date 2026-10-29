"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, Check, FileDown, Lock, Save, Search, Unlock } from "lucide-react";
import { OBSERVATION_LEVELS } from "@/lib/constants";
import { saveObservationGridAction, setCycleStatusAction } from "@/server/actions/observations";
import { Badge, Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ConfirmSubmitButton } from "@/components/ui/form-buttons";
import { cn } from "@/lib/utils";

export type GridDomain = {
  id: string;
  nameEs: string;
  nameEn: string;
  sortOrder: number;
};

export type GridScore = { domainId: string; level: number | null; note: string };

export type GridRow = {
  studentId: string;
  firstName: string;
  lastName: string;
  documentId: string;
  observationId: string | null;
  observationDate: string;
  parentMeetingDate: string;
  parentAttended: boolean;
  studentMeetingDate: string;
  diagnosisNote: string;
  nextFollowUpDate: string;
  scores: GridScore[];
};

export function ObservationGrid({
  cycleId,
  domains,
  initialRows,
  status,
  canFinalize,
  canEditDiagnosis,
}: {
  cycleId: string;
  domains: GridDomain[];
  initialRows: GridRow[];
  status: string;
  canFinalize: boolean;
  canEditDiagnosis: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<GridRow[]>(initialRows);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, startSaving] = useTransition();
  const readOnly = status === "FINAL";

  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(
      (row) =>
        row.firstName.toLowerCase().includes(term) ||
        row.lastName.toLowerCase().includes(term) ||
        row.documentId.toLowerCase().includes(term),
    );
  }, [rows, search]);

  function updateRow(studentId: string, patch: Partial<GridRow>) {
    setRows((current) => current.map((row) => (row.studentId === studentId ? { ...row, ...patch } : row)));
    setDirty(true);
  }

  function updateScore(studentId: string, domainId: string, patch: Partial<GridScore>) {
    setRows((current) =>
      current.map((row) => {
        if (row.studentId !== studentId) return row;
        const exists = row.scores.some((score) => score.domainId === domainId);
        const scores = exists
          ? row.scores.map((score) => (score.domainId === domainId ? { ...score, ...patch } : score))
          : [...row.scores, { domainId, level: null, note: "", ...patch }];
        return { ...row, scores };
      }),
    );
    setDirty(true);
  }

  function scoreFor(row: GridRow, domainId: string): GridScore {
    return row.scores.find((score) => score.domainId === domainId) ?? { domainId, level: null, note: "" };
  }

  function handleSave() {
    startSaving(async () => {
      const result = await saveObservationGridAction({
        cycleId,
        rows: rows.map((row) => ({
          studentId: row.studentId,
          observationDate: row.observationDate,
          parentMeetingDate: row.parentMeetingDate,
          parentAttended: row.parentAttended,
          studentMeetingDate: row.studentMeetingDate,
          diagnosisNote: row.diagnosisNote,
          nextFollowUpDate: row.nextFollowUpDate,
          scores: domains.map((domain) => {
            const score = scoreFor(row, domain.id);
            return { domainId: domain.id, level: score.level, note: score.note };
          }),
        })),
      });
      if (result.ok) {
        toast.success(result.message ?? "Observaciones guardadas.");
        setDirty(false);
        router.refresh();
      } else {
        toast.error(result.message ?? "No fue posible guardar.");
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Filtrar estudiantes…"
            className="pl-9"
            aria-label="Filtrar estudiantes"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {dirty ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700">
              <AlertTriangle className="size-3.5" /> Cambios sin guardar
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-slate-400">
              <Check className="size-3.5" /> Todo guardado
            </span>
          )}
          {!readOnly ? (
            <Button onClick={handleSave} disabled={saving || !dirty} size="sm">
              <Save className="size-4" /> {saving ? "Guardando…" : "Guardar todo"}
            </Button>
          ) : null}
          <Link href={`/api/pdf/f22?cycleId=${cycleId}`} target="_blank">
            <Button variant="outline" size="sm">
              <FileDown className="size-4" /> PDF oficial
            </Button>
          </Link>
          {canFinalize ? (
            <form action={setCycleStatusAction}>
              <input type="hidden" name="cycleId" value={cycleId} />
              <input type="hidden" name="status" value={readOnly ? "DRAFT" : "FINAL"} />
              {readOnly ? (
                <ConfirmSubmitButton variant="secondary" size="sm" message="¿Reabrir este ciclo? Podrá editarse de nuevo.">
                  <Unlock className="size-4" /> Reabrir ciclo
                </ConfirmSubmitButton>
              ) : (
                <ConfirmSubmitButton variant="secondary" size="sm" message="¿Finalizar el ciclo? Se bloqueará la edición.">
                  <Lock className="size-4" /> Finalizar ciclo
                </ConfirmSubmitButton>
              )}
            </form>
          ) : null}
        </div>
      </div>

      {readOnly ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800">
          Este ciclo está finalizado y es de solo lectura. Solo administración o coordinación pueden reabrirlo.
        </div>
      ) : null}

      {!canEditDiagnosis && !readOnly ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          El diagnóstico / remisión del periodo es de solo lectura para docentes. Las notas de los dominios sí son editables.
        </div>
      ) : null}

      {/* Escritorio */}
      <div className="scroll-thin hidden max-h-[68vh] overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm lg:block">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-20 bg-slate-50">
            <tr className="border-b border-slate-200">
              <th className="sticky left-0 z-30 min-w-56 border-r border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                Estudiante
              </th>
              {domains.map((domain) => (
                <th key={domain.id} className="min-w-44 border-r border-slate-100 px-2 py-2 text-left align-bottom">
                  <span className="block text-xs font-semibold text-slate-600">{domain.nameEs.split(" (")[0]}</span>
                  <span className="mt-0.5 block text-[10px] font-normal leading-tight text-slate-400">
                    {domain.nameEn.split(" (")[0]}
                  </span>
                </th>
              ))}
              <th className="min-w-36 border-r border-slate-100 px-2 py-2 text-left text-xs font-semibold text-slate-600">Fecha de observación</th>
              <th className="min-w-40 border-r border-slate-100 px-2 py-2 text-left text-xs font-semibold text-slate-600">Cita con padres</th>
              <th className="min-w-36 border-r border-slate-100 px-2 py-2 text-left text-xs font-semibold text-slate-600">Cita con estudiantes</th>
              <th className="min-w-56 border-r border-slate-100 px-2 py-2 text-left text-xs font-semibold text-slate-600">Diagnóstico / remisión</th>
              <th className="min-w-36 px-2 py-2 text-left text-xs font-semibold text-slate-600">Seguimiento</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((row) => (
              <tr key={row.studentId} className="align-top hover:bg-slate-50/40">
                <td className="sticky left-0 z-10 border-r border-slate-200 bg-white px-3 py-2">
                  <Link href={`/students/${row.studentId}`} className="font-medium text-slate-800 hover:text-brand-700">
                    {row.lastName}, {row.firstName}
                  </Link>
                  <p className="text-[11px] text-slate-400">{row.documentId}</p>
                </td>
                {domains.map((domain) => {
                  const score = scoreFor(row, domain.id);
                  return (
                    <td key={domain.id} className="border-r border-slate-100 px-2 py-2">
                      <Select
                        aria-label={`Nivel ${domain.nameEs} de ${row.firstName}`}
                        value={score.level ?? ""}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateScore(row.studentId, domain.id, {
                            level: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        className="h-8 px-2 py-1 text-xs"
                      >
                        <option value="">—</option>
                        {OBSERVATION_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.value} · {level.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={score.note}
                        disabled={readOnly}
                        onChange={(event) => updateScore(row.studentId, domain.id, { note: event.target.value })}
                        placeholder="Nota"
                        maxLength={500}
                        className="mt-1 h-7 px-2 text-xs"
                        aria-label={`Nota ${domain.nameEs} de ${row.firstName}`}
                      />
                    </td>
                  );
                })}
                <td className="border-r border-slate-100 px-2 py-2">
                  <Input
                    type="date"
                    value={row.observationDate}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { observationDate: event.target.value })}
                    className="h-8 px-2 text-xs"
                  />
                </td>
                <td className="border-r border-slate-100 px-2 py-2">
                  <Input
                    type="date"
                    value={row.parentMeetingDate}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { parentMeetingDate: event.target.value })}
                    className="h-8 px-2 text-xs"
                  />
                  <label className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-600">
                    <input
                      type="checkbox"
                      checked={row.parentAttended}
                      disabled={readOnly}
                      onChange={(event) => updateRow(row.studentId, { parentAttended: event.target.checked })}
                      className="size-3.5 accent-brand-700"
                    />
                    Asistieron
                  </label>
                </td>
                <td className="border-r border-slate-100 px-2 py-2">
                  <Input
                    type="date"
                    value={row.studentMeetingDate}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { studentMeetingDate: event.target.value })}
                    className="h-8 px-2 text-xs"
                  />
                </td>
                <td className="border-r border-slate-100 px-2 py-2">
                  <Textarea
                    value={row.diagnosisNote}
                    onChange={(event) => updateRow(row.studentId, { diagnosisNote: event.target.value })}
                    disabled={readOnly || !canEditDiagnosis}
                    rows={2}
                    maxLength={2000}
                    placeholder={canEditDiagnosis ? "Remisión del periodo…" : "Solo lectura"}
                    className="min-h-16 px-2 py-1 text-xs"
                  />
                </td>
                <td className="px-2 py-2">
                  <Input
                    type="date"
                    value={row.nextFollowUpDate}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { nextFollowUpDate: event.target.value })}
                    className="h-8 px-2 text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 ? <p className="py-10 text-center text-sm text-slate-500">Sin estudiantes que coincidan.</p> : null}
      </div>

      {/* Móvil */}
      <div className="space-y-3 lg:hidden">
        {filtered.map((row) => (
          <Card key={row.studentId}>
            <CardContent className="space-y-3 pt-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Link href={`/students/${row.studentId}`} className="font-medium text-slate-900 hover:text-brand-700">
                    {row.lastName}, {row.firstName}
                  </Link>
                  <p className="text-xs text-slate-400">{row.documentId}</p>
                </div>
                {readOnly ? <Badge tone="green">Finalizado</Badge> : null}
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                {domains.map((domain) => {
                  const score = scoreFor(row, domain.id);
                  return (
                    <div key={domain.id} className="rounded-lg border border-slate-100 p-2">
                      <p className="mb-1 text-xs font-medium text-slate-600">{domain.nameEs.split(" (")[0]}</p>
                      <Select
                        value={score.level ?? ""}
                        disabled={readOnly}
                        onChange={(event) =>
                          updateScore(row.studentId, domain.id, {
                            level: event.target.value ? Number(event.target.value) : null,
                          })
                        }
                        className="h-8 px-2 py-1 text-xs"
                      >
                        <option value="">—</option>
                        {OBSERVATION_LEVELS.map((level) => (
                          <option key={level.value} value={level.value}>
                            {level.value} · {level.label}
                          </option>
                        ))}
                      </Select>
                      <Input
                        value={score.note}
                        disabled={readOnly}
                        onChange={(event) => updateScore(row.studentId, domain.id, { note: event.target.value })}
                        placeholder="Nota"
                        className="mt-1 h-7 px-2 text-xs"
                      />
                    </div>
                  );
                })}
              </div>

              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-slate-500">Observación</span>
                  <Input
                    type="date"
                    value={row.observationDate}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { observationDate: event.target.value })}
                    className="h-8 px-2 text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Cita con padres</span>
                  <Input
                    type="date"
                    value={row.parentMeetingDate}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { parentMeetingDate: event.target.value })}
                    className="h-8 px-2 text-xs"
                  />
                </label>
                <label className="flex items-center gap-2 text-slate-600">
                  <input
                    type="checkbox"
                    checked={row.parentAttended}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { parentAttended: event.target.checked })}
                    className="size-3.5 accent-brand-700"
                  />
                  Asistieron
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Cita con estudiantes</span>
                  <Input
                    type="date"
                    value={row.studentMeetingDate}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { studentMeetingDate: event.target.value })}
                    className="h-8 px-2 text-xs"
                  />
                </label>
                <label className="space-y-1 sm:col-span-2">
                  <span className="text-slate-500">Diagnóstico / remisión</span>
                  <Textarea
                    value={row.diagnosisNote}
                    onChange={(event) => updateRow(row.studentId, { diagnosisNote: event.target.value })}
                    disabled={readOnly || !canEditDiagnosis}
                    rows={2}
                    className="min-h-16 px-2 py-1 text-xs"
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-slate-500">Seguimiento</span>
                  <Input
                    type="date"
                    value={row.nextFollowUpDate}
                    disabled={readOnly}
                    onChange={(event) => updateRow(row.studentId, { nextFollowUpDate: event.target.value })}
                    className="h-8 px-2 text-xs"
                  />
                </label>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!readOnly ? (
        <div className={cn("sticky bottom-4 z-10 flex justify-end", !dirty && "hidden")}>
          <Button onClick={handleSave} disabled={saving} className="shadow-lg">
            <Save className="size-4" /> {saving ? "Guardando…" : "Guardar cambios"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
