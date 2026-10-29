"use client";

import { useActionState, useEffect } from "react";
import { toast } from "sonner";
import { updateSettingsAction } from "@/server/actions/settings";
import { FORM_TITLES, type FormKey } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form-buttons";

type FormRow = { key: FormKey; code: string; version: string; validity: string; rowsPerPage: number };

export function SettingsForm({
  institutionName,
  schoolYear,
  requireSignature,
  logoUrl,
  forms,
}: {
  institutionName: string;
  schoolYear: string;
  requireSignature: boolean;
  logoUrl: string;
  forms: FormRow[];
}) {
  const [state, action] = useActionState(updateSettingsAction, {});

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Configuración guardada.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Institución</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Nombre de la institución" htmlFor="institutionName" error={state.fieldErrors?.institutionName} className="sm:col-span-2">
            <Input id="institutionName" name="institutionName" defaultValue={institutionName} required maxLength={120} />
          </Field>
          <Field label="Año escolar" htmlFor="schoolYear" error={state.fieldErrors?.schoolYear}>
            <Input id="schoolYear" name="schoolYear" defaultValue={schoolYear} required pattern="\d{4}" maxLength={4} />
          </Field>
          <Field label="Firmas en F25" htmlFor="requireSignature" hint="Si se activa, no se podrá guardar una sesión sin ambas firmas.">
            <label className="flex h-10 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-sm">
              <input type="checkbox" name="requireSignature" defaultChecked={requireSignature} className="size-4 accent-brand-700" />
              Exigir firmas
            </label>
          </Field>

          <div className="sm:col-span-2">
            <Field label="Logo institucional" htmlFor="logo" error={state.fieldErrors?.logo} hint="PNG, JPG o WEBP · máximo 200 KB. Se usa en los PDF oficiales.">
              <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" className="h-10 py-1.5" />
            </Field>
            {logoUrl ? (
              <label className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                <input type="checkbox" name="removeLogo" className="size-3.5 accent-brand-700" />
                Quitar logo personalizado y usar el original
              </label>
            ) : null}
          </div>
          <div className="flex items-end sm:col-span-2">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt="Logo actual" className="h-16 w-auto rounded border border-slate-200 bg-white p-1" />
            ) : (
              <p className="text-xs text-slate-400">Logo original del formato.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadatos de los formatos</CardTitle>
          <p className="text-xs text-slate-500">
            Código, versión y vigencia que aparecen en el encabezado de cada PDF. Las filas por página aplican a los formatos con tabla.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {forms.map((form) => (
            <div key={form.key} className="grid gap-3 rounded-lg border border-slate-100 p-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
              <p className="text-sm font-medium text-slate-700 lg:col-span-1">{FORM_TITLES[form.key]}</p>
              <Field label="Código" htmlFor={`code-${form.key}`}>
                <Input id={`code-${form.key}`} name={`code-${form.key}`} defaultValue={form.code} required />
              </Field>
              <Field label="Versión" htmlFor={`version-${form.key}`}>
                <Input id={`version-${form.key}`} name={`version-${form.key}`} defaultValue={form.version} required />
              </Field>
              <Field label="Vigencia" htmlFor={`validity-${form.key}`}>
                <Input id={`validity-${form.key}`} name={`validity-${form.key}`} defaultValue={form.validity} required />
              </Field>
              {form.key !== "f23" ? (
                <Field label="Filas por página" htmlFor={`rows-${form.key}`}>
                  <Input
                    id={`rows-${form.key}`}
                    name={`rows-${form.key}`}
                    type="number"
                    min={5}
                    max={40}
                    defaultValue={form.rowsPerPage}
                  />
                </Field>
              ) : (
                <div className="hidden lg:block" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>Guardar configuración</SubmitButton>
      </div>
    </form>
  );
}
