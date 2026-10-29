"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { assignTherapyAction } from "@/server/actions/students";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";

export function TherapyAssignForm({
  studentId,
  therapies,
  therapists,
  defaultDate,
}: {
  studentId: string;
  therapies: { id: string; nameEs: string }[];
  therapists: { id: string; name: string }[];
  defaultDate: string;
}) {
  const [state, action, pending] = useActionState(assignTherapyAction, {});

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Terapia asignada.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end">
      <input type="hidden" name="studentId" value={studentId} />
      <Field label="Terapia o área" htmlFor="therapyId" error={state.fieldErrors?.therapyId}>
        <Select id="therapyId" name="therapyId" required>
          <option value="">Selecciona…</option>
          {therapies.map((therapy) => (
            <option key={therapy.id} value={therapy.id}>
              {therapy.nameEs}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Terapeuta" htmlFor="therapistId">
        <Select id="therapistId" name="therapistId" defaultValue="">
          <option value="">Sin asignar</option>
          {therapists.map((therapist) => (
            <option key={therapist.id} value={therapist.id}>
              {therapist.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Fecha de inicio" htmlFor="startDate">
        <Input id="startDate" name="startDate" type="date" defaultValue={defaultDate} />
      </Field>
      <Field label="Nota" htmlFor="notes" className="lg:col-span-1">
        <Input id="notes" name="notes" maxLength={500} placeholder="Opcional" />
      </Field>
      <Button type="submit" disabled={pending} variant="outline">
        {pending ? "Asignando…" : "Asignar terapia"}
      </Button>
    </form>
  );
}
