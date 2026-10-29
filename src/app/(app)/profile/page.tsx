import { requireUser } from "@/lib/dal";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ChangePasswordForm } from "@/components/users/user-forms";
import { ProfileNameForm } from "./profile-form";

export const metadata = { title: "Mi cuenta" };

export default async function ProfilePage() {
  const user = await requireUser();
  const record = await prisma.user.findUnique({
    where: { id: user.id },
    include: { courseLinks: { include: { course: { select: { name: true } } } } },
  });

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader title="Mi cuenta" description="Actualiza tus datos y tu contraseña de acceso." />

      <Card>
        <CardHeader>
          <CardTitle>Datos personales</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Correo</dt>
              <dd className="text-slate-800">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-slate-400">Rol</dt>
              <dd className="text-slate-800">{ROLE_LABELS[user.role]}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wide text-slate-400">Alcance</dt>
              <dd className="text-slate-800">
                {record?.role === "ADMIN" || record?.role === "COORDINATOR"
                  ? "Todos los cursos"
                  : record?.courseLinks.map((link) => link.course.name).join(", ") || "Sin cursos asignados"}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-slate-500">{ROLE_DESCRIPTIONS[user.role]}</p>
          <ProfileNameForm name={user.name} />
          {record ? <p className="text-xs text-slate-400">Último acceso: {record.lastLoginAt ? formatDateTime(record.lastLoginAt) : "—"}</p> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cambiar contraseña</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
