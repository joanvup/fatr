"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  changeOwnPasswordAction,
  createUserAction,
  resetPasswordAction,
  updateUserAction,
} from "@/server/actions/users";
import { ROLES, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/form-buttons";

type UserRecord = {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  courseIds: string[];
};

export function UserForm({
  mode,
  user,
  courses,
}: {
  mode: "create" | "edit";
  user?: UserRecord;
  courses: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(
    mode === "create" ? createUserAction : updateUserAction,
    {},
  );

  useEffect(() => {
    if (!state.ok) return;
    toast.success(state.message ?? "Guardado.");
    if (mode === "create" && state.id) router.push(`/users/${state.id}`);
    else router.refresh();
  }, [state, mode, router]);

  return (
    <form action={action} className="space-y-4">
      {mode === "edit" ? <input type="hidden" name="id" value={user?.id} /> : null}
      {state.message && !state.ok ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{mode === "create" ? "Datos del nuevo usuario" : "Datos del usuario"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre completo" htmlFor={`name-${mode}`} required error={state.fieldErrors?.name}>
            <Input id={`name-${mode}`} name="name" defaultValue={user?.name} required maxLength={120} />
          </Field>
          <Field label="Correo electrónico" htmlFor={`email-${mode}`} required error={state.fieldErrors?.email}>
            <Input id={`email-${mode}`} name="email" type="email" defaultValue={user?.email} required />
          </Field>
          <Field label="Rol" htmlFor={`role-${mode}`} required error={state.fieldErrors?.role}>
            <Select id={`role-${mode}`} name="role" defaultValue={user?.role ?? "TEACHER"} required>
              {ROLES.map((role) => (
                <option key={role} value={role}>
                  {ROLE_LABELS[role]} — {ROLE_DESCRIPTIONS[role]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Estado" htmlFor={`active-${mode}`}>
            <Select id={`active-${mode}`} name="active" defaultValue={String(user?.active ?? true)}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </Select>
          </Field>
          {mode === "create" ? (
            <Field
              label="Contraseña temporal"
              htmlFor="password"
              required
              error={state.fieldErrors?.password}
              hint="Mínimo 8 caracteres. Compártela por un canal seguro."
            >
              <Input id="password" name="password" type="text" required minLength={8} autoComplete="new-password" />
            </Field>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cursos asignados</CardTitle>
          <p className="text-xs text-slate-500">
            Administración y coordinación ven todos los cursos. Terapeutas y docentes solo ven los cursos marcados aquí.
          </p>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <p className="text-sm text-slate-500">No hay cursos activos.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {courses.map((course) => (
                <label
                  key={course.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <Checkbox name="courseIds" value={course.id} defaultChecked={user?.courseIds.includes(course.id)} />
                  {course.name}
                </label>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
        <SubmitButton>{mode === "create" ? "Crear usuario" : "Guardar cambios"}</SubmitButton>
      </div>
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetPasswordAction, {});

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Contraseña restablecida.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="id" value={userId} />
      <Field label="Nueva contraseña" htmlFor={`reset-${userId}`} error={state.fieldErrors?.password}>
        <Input id={`reset-${userId}`} name="password" type="text" minLength={8} required placeholder="Mínimo 8 caracteres" />
      </Field>
      <SubmitButton variant="outline" size="sm">
        Restablecer contraseña
      </SubmitButton>
    </form>
  );
}

export function ChangePasswordForm() {
  const [state, action] = useActionState(changeOwnPasswordAction, {});

  useEffect(() => {
    if (state.ok) toast.success(state.message ?? "Contraseña actualizada.");
    else if (state.message) toast.error(state.message);
  }, [state]);

  return (
    <form action={action} className="space-y-3">
      <Field label="Contraseña actual" htmlFor="currentPassword" required error={state.fieldErrors?.currentPassword}>
        <Input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nueva contraseña" htmlFor="newPassword" required error={state.fieldErrors?.newPassword}>
          <Input id="newPassword" name="newPassword" type="password" minLength={8} autoComplete="new-password" required />
        </Field>
        <Field label="Confirmar contraseña" htmlFor="confirmPassword" required error={state.fieldErrors?.confirmPassword}>
          <Input id="confirmPassword" name="confirmPassword" type="password" minLength={8} autoComplete="new-password" required />
        </Field>
      </div>
      <SubmitButton>Cambiar contraseña</SubmitButton>
    </form>
  );
}
