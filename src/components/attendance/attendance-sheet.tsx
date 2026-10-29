"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { formatDuration, minutesBetween } from "@/lib/dates";
import { ROLE_LABELS, type Role } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SignaturePad } from "@/components/attendance/signature-pad";
import { StudentCombobox } from "@/components/students/student-combobox";

export type AttendanceStudentOption = {
  id: string;
  name: string;
  documentId: string;
  courseName: string;
};

export type AttendanceTherapyOption = {
  id: string;
  nameEs: string;
  kind: string;
};

export type AttendanceProfessionalOption = {
  id: string;
  name: string;
  role: Role;
};

export function AttendanceSheet({
  students,
  therapies,
  professionals,
  defaultDate,
  defaultProfessionalId,
  defaultStudentId,
  requireSignature,
}: {
  students: AttendanceStudentOption[];
  therapies: AttendanceTherapyOption[];
  professionals: AttendanceProfessionalOption[];
  defaultDate: string;
  defaultProfessionalId: string;
  defaultStudentId?: string;
  requireSignature: boolean;
}) {
  const router = useRouter();
  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [therapyId, setTherapyId] = useState("");
  const [date, setDate] = useState(defaultDate);
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("08:45");
  const [professionalId, setProfessionalId] = useState(defaultProfessionalId);
  const [notes, setNotes] = useState("");
  const [signerGuardianName, setSignerGuardianName] = useState("");
  const [professionalSignature, setProfessionalSignature] = useState("");
  const [guardianSignature, setGuardianSignature] = useState("");
  const [padKey, setPadKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const duration = minutesBetween(startTime, endTime);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!studentId) {
      setError("Selecciona el estudiante.");
      return;
    }
    if (!therapyId) {
      setError("Selecciona la terapia o área.");
      return;
    }
    if (!duration) {
      setError("La hora final debe ser posterior a la hora inicial.");
      return;
    }
    if (requireSignature && !professionalSignature) {
      setError("La configuración institucional exige la firma del profesional.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          therapyId,
          date,
          startTime,
          endTime,
          professionalId,
          notes: notes || undefined,
          professionalSignature: professionalSignature || undefined,
          guardianSignature: guardianSignature || undefined,
          signerGuardianName: signerGuardianName || undefined,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        error?: string;
        durationMinutes?: number | null;
      };

      if (!response.ok) {
        setError(result.error ?? "No se pudo guardar la sesión.");
        return;
      }

      toast.success("Sesión registrada", {
        description: `${formatDuration(result.durationMinutes ?? duration)} · ${date}`,
      });
      setStudentId("");
      setTherapyId("");
      setNotes("");
      setSignerGuardianName("");
      setProfessionalSignature("");
      setGuardianSignature("");
      setPadKey((value) => value + 1);
      router.refresh();
    } catch {
      setError("No se pudo conectar con el servidor. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registrar sesión</CardTitle>
        <p className="text-xs text-slate-500">
          Formato PM-04-F25. La firma se captura con el puntero o el dedo y se guarda como imagen PNG.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          {error ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              {error}
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Fecha" htmlFor="date" required>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(event) => setDate(event.currentTarget.value)}
                required
              />
            </Field>
            <Field label="Hora inicial" htmlFor="startTime" required>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(event) => setStartTime(event.currentTarget.value)}
                required
              />
            </Field>
            <Field label="Hora final" htmlFor="endTime" required>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(event) => setEndTime(event.currentTarget.value)}
                required
              />
            </Field>
            <Field label="Duración" htmlFor="duration">
              <Input id="duration" value={formatDuration(duration)} readOnly disabled />
            </Field>

            <Field label="Estudiante" htmlFor="studentId" required className="sm:col-span-2">
              <StudentCombobox
                id="studentId"
                students={students}
                value={studentId}
                onChange={setStudentId}
                invalid={Boolean(error) && !studentId}
                placeholder="Selecciona un estudiante"
              />
            </Field>
            <Field label="Profesional" htmlFor="professionalId" required className="sm:col-span-2">
              <Select
                id="professionalId"
                value={professionalId}
                onChange={(event) => setProfessionalId(event.currentTarget.value)}
                required
              >
                {professionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.name} · {ROLE_LABELS[professional.role]}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Terapia / área" htmlFor="therapyId" required className="sm:col-span-2">
              <Select
                id="therapyId"
                value={therapyId}
                onChange={(event) => setTherapyId(event.currentTarget.value)}
                required
              >
                <option value="" disabled>
                  Selecciona la terapia o área
                </option>
                {therapies.map((therapy) => (
                  <option key={therapy.id} value={therapy.id}>
                    {therapy.nameEs}
                    {therapy.kind === "SUPPORT_AREA" ? " · Área de apoyo" : ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field
              label="Nombre del estudiante / acudiente"
              htmlFor="signerGuardianName"
              hint="Se usa cuando se firma por el acudiente."
              className="sm:col-span-2"
            >
              <Input
                id="signerGuardianName"
                value={signerGuardianName}
                onChange={(event) => setSignerGuardianName(event.currentTarget.value)}
                maxLength={120}
                placeholder="Nombre de quien firma"
              />
            </Field>

            <Field label="Observaciones" htmlFor="notes" className="sm:col-span-2 lg:col-span-4">
              <Textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.currentTarget.value)}
                maxLength={1000}
                rows={2}
                placeholder="Notas de la sesión (opcional)…"
              />
            </Field>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <SignaturePad
              key={`pro-${padKey}`}
              label="Firma del profesional"
              required={requireSignature}
              hint={requireSignature ? "Obligatoria" : "Opcional"}
              onChange={setProfessionalSignature}
            />
            <SignaturePad
              key={`gua-${padKey}`}
              label="Firma del estudiante / acudiente"
              hint="Opcional"
              onChange={setGuardianSignature}
            />
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {requireSignature
                ? "La configuración institucional exige la firma del profesional."
                : "Puedes guardar la sesión sin firmas; quedarán pendientes en el registro."}
            </p>
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : <Save className="size-4" />}
              Guardar sesión
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
