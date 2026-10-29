"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createCycleAction } from "@/server/actions/observations";
import { COURSE_PERIODS, PERIOD_LABELS } from "@/lib/constants";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form-buttons";

export function CycleForm({
  courses,
  year,
  defaultFrom,
  defaultTo,
}: {
  courses: { id: string; name: string }[];
  year: number;
  defaultFrom: string;
  defaultTo: string;
}) {
  const router = useRouter();
  const [state, action] = useActionState(createCycleAction, {});

  useEffect(() => {
    if (state.ok && state.id) {
      toast.success("Ciclo creado.");
      router.push(`/observations/${state.id}`);
      router.refresh();
    } else if (state.message && !state.ok) {
      toast.error(state.message);
    }
  }, [state, router]);

  return (
    <form action={action} className="grid gap-3 lg:grid-cols-12 lg:items-end">
      <Field label="Curso" htmlFor="cycle-course" required error={state.fieldErrors?.courseId} className="lg:col-span-3">
        <Select id="cycle-course" name="courseId" required>
          <option value="">Selecciona un curso…</option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Año" htmlFor="cycle-year" required error={state.fieldErrors?.year} className="lg:col-span-1">
        <Input id="cycle-year" name="year" type="number" min={2000} max={2100} defaultValue={year} required />
      </Field>
      <Field label="Periodo" htmlFor="cycle-period" required error={state.fieldErrors?.period} className="lg:col-span-2">
        <Select id="cycle-period" name="period" defaultValue="1" required>
          {COURSE_PERIODS.map((period) => (
            <option key={period} value={period}>
              {PERIOD_LABELS[period]}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Etiqueta" htmlFor="cycle-label" className="lg:col-span-2">
        <Input id="cycle-label" name="label" maxLength={80} placeholder="Opcional" />
      </Field>
      <Field label="Desde" htmlFor="cycle-from" required error={state.fieldErrors?.dateFrom} className="lg:col-span-2">
        <Input id="cycle-from" name="dateFrom" type="date" defaultValue={defaultFrom} required />
      </Field>
      <Field label="Hasta" htmlFor="cycle-to" required error={state.fieldErrors?.dateTo} className="lg:col-span-2">
        <Input id="cycle-to" name="dateTo" type="date" defaultValue={defaultTo} required />
      </Field>
      <div className="lg:col-span-12">
        <SubmitButton className="w-full sm:w-auto">Crear ciclo de observación</SubmitButton>
      </div>
    </form>
  );
}
