"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { createTherapyAction, updateDomainAction, updateTherapyAction } from "@/server/actions/catalogs";
import { Card, CardContent } from "@/components/ui/card";
import { Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form-buttons";
import { THERAPY_KIND_LABELS } from "@/lib/constants";

function useToastResult(state: { ok?: boolean; message?: string }) {
  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Guardado.");
    else if (state.message) toast.error(state.message);
  }, [state]);
}

export function DomainCard({
  domain,
}: {
  domain: { id: string; key: string; nameEs: string; nameEn: string; sortOrder: number; active: boolean };
}) {
  const [state, action] = useActionState(updateDomainAction, {});
  useToastResult(state);

  return (
    <Card>
      <CardContent className="pt-4">
        <form action={action} className="grid gap-3 lg:grid-cols-12 lg:items-end">
          <input type="hidden" name="id" value={domain.id} />
          <Field label="Nombre en español" htmlFor={`es-${domain.id}`} className="lg:col-span-4">
            <Input id={`es-${domain.id}`} name="nameEs" defaultValue={domain.nameEs} maxLength={300} />
          </Field>
          <Field label="Nombre en inglés" htmlFor={`en-${domain.id}`} className="lg:col-span-4">
            <Input id={`en-${domain.id}`} name="nameEn" defaultValue={domain.nameEn} maxLength={300} />
          </Field>
          <Field label="Orden" htmlFor={`order-${domain.id}`} className="lg:col-span-1">
            <Input id={`order-${domain.id}`} name="sortOrder" type="number" min={1} max={99} defaultValue={domain.sortOrder} />
          </Field>
          <Field label="Estado" htmlFor={`active-${domain.id}`} className="lg:col-span-1">
            <Select id={`active-${domain.id}`} name="active" defaultValue={String(domain.active)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </Select>
          </Field>
          <div className="lg:col-span-2">
            <SubmitButton variant="outline" className="w-full">
              Guardar
            </SubmitButton>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-400">Clave interna: {domain.key}</p>
      </CardContent>
    </Card>
  );
}

export function TherapyCard({
  therapy,
}: {
  therapy: { id: string; key: string; nameEs: string; kind: string; sortOrder: number; active: boolean };
}) {
  const [state, action] = useActionState(updateTherapyAction, {});
  useToastResult(state);

  return (
    <Card>
      <CardContent className="pt-4">
        <form action={action} className="grid gap-3 lg:grid-cols-12 lg:items-end">
          <input type="hidden" name="id" value={therapy.id} />
          <Field label="Nombre" htmlFor={`name-${therapy.id}`} className="lg:col-span-4">
            <Input id={`name-${therapy.id}`} name="nameEs" defaultValue={therapy.nameEs} maxLength={120} />
          </Field>
          <Field label="Tipo" htmlFor={`kind-${therapy.id}`} className="lg:col-span-3">
            <Select id={`kind-${therapy.id}`} name="kind" defaultValue={therapy.kind}>
              <option value="THERAPY">{THERAPY_KIND_LABELS.THERAPY}</option>
              <option value="SUPPORT_AREA">{THERAPY_KIND_LABELS.SUPPORT_AREA}</option>
            </Select>
          </Field>
          <Field label="Orden" htmlFor={`order-${therapy.id}`} className="lg:col-span-1">
            <Input id={`order-${therapy.id}`} name="sortOrder" type="number" min={1} max={99} defaultValue={therapy.sortOrder} />
          </Field>
          <Field label="Estado" htmlFor={`active-${therapy.id}`} className="lg:col-span-1">
            <Select id={`active-${therapy.id}`} name="active" defaultValue={String(therapy.active)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </Select>
          </Field>
          <div className="lg:col-span-2">
            <SubmitButton variant="outline" className="w-full">
              Guardar
            </SubmitButton>
          </div>
        </form>
        <p className="mt-2 text-xs text-slate-400">Clave interna: {therapy.key}</p>
      </CardContent>
    </Card>
  );
}

export function NewTherapyForm() {
  const [state, action] = useActionState(createTherapyAction, {});
  useToastResult(state);

  return (
    <form action={action} className="grid gap-3 sm:grid-cols-3 sm:items-end">
      <Field label="Nombre" htmlFor="new-therapy-name" error={state.fieldErrors?.nameEs}>
        <Input id="new-therapy-name" name="nameEs" placeholder="Ej. Musicoterapia" maxLength={120} required />
      </Field>
      <Field label="Tipo" htmlFor="new-therapy-kind">
        <Select id="new-therapy-kind" name="kind" defaultValue="THERAPY">
          <option value="THERAPY">{THERAPY_KIND_LABELS.THERAPY}</option>
          <option value="SUPPORT_AREA">{THERAPY_KIND_LABELS.SUPPORT_AREA}</option>
        </Select>
      </Field>
      <SubmitButton>Agregar terapia</SubmitButton>
    </form>
  );
}
