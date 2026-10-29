"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateOwnProfileAction } from "@/server/actions/students";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form-buttons";

export function ProfileNameForm({ name }: { name: string }) {
  const [state, action] = useActionState(updateOwnProfileAction, {});

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Datos actualizados.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <Field label="Nombre completo" htmlFor="profile-name" error={state.fieldErrors?.name}>
        <Input id="profile-name" name="name" defaultValue={name} required maxLength={120} />
      </Field>
      <SubmitButton variant="outline">Guardar nombre</SubmitButton>
    </form>
  );
}
