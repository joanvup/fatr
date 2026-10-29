"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ShieldAlert } from "lucide-react";
import { createStudentAction, updateStudentAction } from "@/server/actions/students";
import { SEX_OPTIONS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form-buttons";

type StudentRecord = {
  id: string;
  documentId: string;
  firstName: string;
  lastName: string;
  birthDate: string | null;
  sex: string;
  grade: string;
  courseId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  guardianEmail: string | null;
  diagnosis: string | null;
  active: boolean;
};

export function StudentForm({
  mode,
  student,
  courses,
  canSeeDiagnosis,
}: {
  mode: "create" | "edit";
  student?: StudentRecord;
  courses: { id: string; name: string }[];
  canSeeDiagnosis: boolean;
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    mode === "create" ? createStudentAction : updateStudentAction,
    {},
  );

  useEffect(() => {
    if (state.ok && state.id) {
      router.push(`/students/${state.id}?${mode === "create" ? "created" : "updated"}=1`);
      router.refresh();
    }
  }, [state, router, mode]);

  const errors = state.fieldErrors ?? {};

  return (
    <form action={action} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={student?.id} /> : null}

      {state.message && !state.ok ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          {state.message}
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Datos del estudiante</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Número de documento" htmlFor="documentId" required error={errors.documentId}>
            <Input id="documentId" name="documentId" defaultValue={student?.documentId} required maxLength={30} />
          </Field>
          <Field label="Nombres" htmlFor="firstName" required error={errors.firstName}>
            <Input id="firstName" name="firstName" defaultValue={student?.firstName} required maxLength={80} />
          </Field>
          <Field label="Apellidos" htmlFor="lastName" required error={errors.lastName}>
            <Input id="lastName" name="lastName" defaultValue={student?.lastName} required maxLength={80} />
          </Field>
          <Field label="Fecha de nacimiento" htmlFor="birthDate" error={errors.birthDate}>
            <Input id="birthDate" name="birthDate" type="date" defaultValue={student?.birthDate ?? ""} />
          </Field>
          <Field label="Sexo" htmlFor="sex" required error={errors.sex}>
            <Select id="sex" name="sex" defaultValue={student?.sex ?? "F"} required>
              {SEX_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Grado escolar" htmlFor="grade" required error={errors.grade}>
            <Input id="grade" name="grade" defaultValue={student?.grade} required maxLength={40} />
          </Field>
          <Field label="Curso" htmlFor="courseId" error={errors.courseId} hint="Déjalo vacío si aún no tiene curso asignado.">
            <Select id="courseId" name="courseId" defaultValue={student?.courseId ?? ""}>
              <option value="">Sin curso</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </Select>
          </Field>
          {mode === "edit" ? (
            <Field label="Estado" htmlFor="active" className="flex flex-col justify-end">
              <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm">
                <input
                  type="checkbox"
                  name="active"
                  defaultChecked={student?.active}
                  className="size-4 accent-brand-700"
                />
                Estudiante activo
              </label>
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Acudiente</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field label="Nombre del acudiente" htmlFor="guardianName" error={errors.guardianName}>
            <Input id="guardianName" name="guardianName" defaultValue={student?.guardianName ?? ""} maxLength={120} />
          </Field>
          <Field label="Teléfono" htmlFor="guardianPhone" error={errors.guardianPhone}>
            <Input id="guardianPhone" name="guardianPhone" defaultValue={student?.guardianPhone ?? ""} maxLength={40} />
          </Field>
          <Field label="Correo" htmlFor="guardianEmail" error={errors.guardianEmail}>
            <Input id="guardianEmail" name="guardianEmail" type="email" defaultValue={student?.guardianEmail ?? ""} />
          </Field>
        </CardContent>
      </Card>

      {canSeeDiagnosis ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-600" /> Diagnóstico clínico
            </CardTitle>
            <p className="text-xs text-slate-500">
              Uso exclusivo terapeuta / orientadora escolar. Este campo no es visible para docentes.
            </p>
          </CardHeader>
          <CardContent>
            <Field label="Diagnóstico" htmlFor="diagnosis" error={errors.diagnosis} hint="Opcional. Máximo 4.000 caracteres.">
              <Textarea
                id="diagnosis"
                name="diagnosis"
                defaultValue={student?.diagnosis ?? ""}
                rows={4}
                maxLength={4000}
                placeholder="Diagnóstico o remisión clínica…"
              />
            </Field>
          </CardContent>
        </Card>
      ) : null}

      <div className="flex items-center justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <SubmitButton>{mode === "create" ? "Registrar estudiante" : "Guardar cambios"}</SubmitButton>
      </div>
    </form>
  );
}
