"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCourseAction, updateCourseAction } from "@/server/actions/courses";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form-buttons";

export function CourseForm({
  mode,
  course,
  year,
}: {
  mode: "create" | "edit";
  course?: { id: string; name: string; grade: string; year: number; active: boolean };
  year: number;
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    mode === "create" ? createCourseAction : updateCourseAction,
    {},
  );

  useEffect(() => {
    if (!state.ok) return;
    if (mode === "create" && state.id) {
      toast.success("Curso creado.");
      router.push(`/courses/${state.id}`);
      router.refresh();
    } else {
      toast.success("Curso actualizado.");
      router.refresh();
    }
  }, [state, mode, router]);

  return (
    <form action={action} className="space-y-3">
      {mode === "edit" ? <input type="hidden" name="id" value={course?.id} /> : null}
      {state.message && !state.ok ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Nombre del curso" htmlFor={`name-${mode}`} required error={state.fieldErrors?.name}>
          <Input id={`name-${mode}`} name="name" defaultValue={course?.name} required maxLength={80} placeholder="Primaria 4° A" />
        </Field>
        <Field label="Grado" htmlFor={`grade-${mode}`} required error={state.fieldErrors?.grade}>
          <Input id={`grade-${mode}`} name="grade" defaultValue={course?.grade} required maxLength={40} placeholder="4°" />
        </Field>
        <Field label="Año escolar" htmlFor={`year-${mode}`} required error={state.fieldErrors?.year}>
          <Input id={`year-${mode}`} name="year" type="number" min={2000} max={2100} defaultValue={course?.year ?? year} required />
        </Field>
        {mode === "edit" ? (
          <Field label="Estado" htmlFor={`active-${mode}`}>
            <Select id={`active-${mode}`} name="active" defaultValue={String(course?.active ?? true)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </Select>
          </Field>
        ) : null}
        <div className="flex items-end">
          <SubmitButton className="w-full">{mode === "create" ? "Crear curso" : "Guardar"}</SubmitButton>
        </div>
      </div>
      {mode === "edit" ? (
        <div className="flex justify-end">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            Volver
          </Button>
        </div>
      ) : null}
    </form>
  );
}
