"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { createFollowUpAction, updateFollowUpAction } from "@/server/actions/followUps";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form-buttons";
import { StudentCombobox } from "@/components/students/student-combobox";

export type FollowUpRecord = {
  id: string;
  studentId: string;
  cycleLabel: string | null;
  startDate: string;
  followUpDate: string;
  realizationDate: string;
  diagnosisSnapshot: string | null;
  descriptionInitial: string | null;
  strategies: string | null;
  achievements: string | null;
  followUpNotes: string | null;
  responsibleName: string;
  workArea: string | null;
  counselorName: string | null;
  status: string;
};

export type FollowUpStudentOption = {
  id: string;
  name: string;
  documentId: string;
  courseName: string;
};

function CountedTextarea({
  label,
  name,
  defaultValue,
  placeholder,
  maxLength,
  rows,
}: {
  label: string;
  name: string;
  defaultValue: string;
  placeholder: string;
  maxLength: number;
  rows: number;
}) {
  const [length, setLength] = useState(defaultValue.length);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={name} className="block text-sm font-medium text-slate-700">
          {label}
        </label>
        <span className="text-xs tabular-nums text-slate-400" aria-live="polite">
          {length} / {maxLength}
        </span>
      </div>
      <Textarea
        id={name}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        maxLength={maxLength}
        rows={rows}
        onChange={(event) => setLength(event.currentTarget.value.length)}
      />
    </div>
  );
}

export function FollowUpForm({
  mode,
  followUp,
  students,
  defaultStudentId,
  defaultResponsible,
  defaultCycle,
  today,
}: {
  mode: "create" | "edit";
  followUp?: FollowUpRecord;
  students: FollowUpStudentOption[];
  defaultStudentId?: string;
  defaultResponsible: string;
  defaultCycle: string;
  today: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    mode === "create" ? createFollowUpAction : updateFollowUpAction,
    {},
  );

  useEffect(() => {
    if (state.ok && state.id) {
      router.push(`/follow-ups/${state.id}?${mode === "create" ? "created" : "updated"}=1`);
      router.refresh();
    }
  }, [state, router, mode]);

  const errors = state.fieldErrors ?? {};
  const [studentId, setStudentId] = useState(followUp?.studentId ?? defaultStudentId ?? "");
  const selectedStudent = students.find((student) => student.id === studentId);

  return (
    <form action={action} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={followUp?.id} /> : null}

      {state.message && !state.ok ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datos del seguimiento</CardTitle>
          <p className="text-xs text-slate-500">
            Formato PM-04-F23. El documento conserva los datos del momento en que se registra.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mode === "create" ? (
            <Field label="Estudiante" htmlFor="studentId" required error={errors.studentId} className="sm:col-span-2">
              <StudentCombobox
                id="studentId"
                name="studentId"
                students={students}
                value={studentId}
                onChange={setStudentId}
                required
                invalid={Boolean(errors.studentId)}
                placeholder="Selecciona un estudiante"
              />
            </Field>
          ) : (
            <>
              <input type="hidden" name="studentId" value={followUp?.studentId} />
              <div className="sm:col-span-2">
                <p className="text-sm font-medium text-slate-700">Estudiante</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {selectedStudent
                    ? `${selectedStudent.name} · ${selectedStudent.documentId} · ${selectedStudent.courseName}`
                    : "Estudiante del seguimiento"}
                </p>
              </div>
            </>
          )}

          <Field label="Ciclo / periodo" htmlFor="cycleLabel" error={errors.cycleLabel} hint="Por ejemplo: 2026-1.">
            <Input id="cycleLabel" name="cycleLabel" defaultValue={followUp?.cycleLabel ?? defaultCycle} maxLength={80} />
          </Field>
          <Field label="Fecha de inicio" htmlFor="startDate" required error={errors.startDate}>
            <Input id="startDate" name="startDate" type="date" defaultValue={followUp?.startDate ?? today} required />
          </Field>
          <Field label="Fecha de seguimiento" htmlFor="followUpDate" required error={errors.followUpDate}>
            <Input id="followUpDate" name="followUpDate" type="date" defaultValue={followUp?.followUpDate ?? today} required />
          </Field>
          <Field label="Fecha de realización" htmlFor="realizationDate" required error={errors.realizationDate}>
            <Input
              id="realizationDate"
              name="realizationDate"
              type="date"
              defaultValue={followUp?.realizationDate ?? today}
              required
            />
          </Field>
          <Field label="Estado" htmlFor="status" error={errors.status}>
            <Select id="status" name="status" defaultValue={followUp?.status ?? "DRAFT"}>
              <option value="DRAFT">Borrador</option>
              <option value="FINAL">Cerrado</option>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card className="border-amber-200 bg-amber-50/40">
        <CardHeader className="border-amber-100">
          <CardTitle className="flex items-center gap-2 text-amber-900">
            <ShieldAlert className="size-4 text-amber-600" /> Diagnóstico
          </CardTitle>
          <p className="text-xs text-amber-700">Uso exclusivo terapeuta / orientadora escolar.</p>
        </CardHeader>
        <CardContent>
          {mode === "edit" ? (
            <p className="whitespace-pre-wrap rounded-lg border border-amber-100 bg-white px-3 py-2 text-sm text-slate-700">
              {followUp?.diagnosisSnapshot || "Sin diagnóstico registrado al crear el seguimiento."}
            </p>
          ) : (
            <p className="text-sm text-amber-900">
              El diagnóstico se toma automáticamente del registro clínico del estudiante. No se digita en este formato y
              no es visible para docentes.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Proceso de seguimiento</CardTitle>
          <p className="text-xs text-slate-500">Cada bloque admite hasta 8.000 caracteres; el PDF continúa en otra página si es necesario.</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <CountedTextarea
            label="Estado inicial"
            name="descriptionInitial"
            defaultValue={followUp?.descriptionInitial ?? ""}
            placeholder="Describe la situación inicial del estudiante…"
            maxLength={8000}
            rows={5}
          />
          <CountedTextarea
            label="Técnicas y estrategias"
            name="strategies"
            defaultValue={followUp?.strategies ?? ""}
            placeholder="Actividades, técnicas y estrategias implementadas…"
            maxLength={8000}
            rows={5}
          />
          <CountedTextarea
            label="Alcances"
            name="achievements"
            defaultValue={followUp?.achievements ?? ""}
            placeholder="Avances y logros observados…"
            maxLength={8000}
            rows={5}
          />
          <CountedTextarea
            label="Seguimiento"
            name="followUpNotes"
            defaultValue={followUp?.followUpNotes ?? ""}
            placeholder="Recomendaciones y plan de continuidad…"
            maxLength={8000}
            rows={5}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Responsables</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Responsable" htmlFor="responsibleName" required error={errors.responsibleName}>
            <Input
              id="responsibleName"
              name="responsibleName"
              defaultValue={followUp?.responsibleName ?? defaultResponsible}
              required
              maxLength={120}
            />
          </Field>
          <Field label="Área" htmlFor="workArea" error={errors.workArea} hint="Fonoaudiología, Psicología, Terapia Ocupacional…">
            <Input id="workArea" name="workArea" defaultValue={followUp?.workArea ?? ""} maxLength={120} />
          </Field>
          <Field label="Orientadora escolar" htmlFor="counselorName" error={errors.counselorName}>
            <Input id="counselorName" name="counselorName" defaultValue={followUp?.counselorName ?? ""} maxLength={120} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <SubmitButton>{mode === "create" ? "Crear seguimiento" : "Guardar cambios"}</SubmitButton>
      </div>
    </form>
  );
}
