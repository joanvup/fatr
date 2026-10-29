import Link from "next/link";
import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { ROLE_LABELS } from "@/lib/constants";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { UserForm } from "@/components/users/user-forms";

export const metadata = { title: "Usuarios" };

export default async function UsersPage() {
  await requirePermission("users.manage");
  const [users, courses] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ active: "desc" }, { name: "asc" }],
      include: { courseLinks: { include: { course: { select: { name: true } } } } },
    }),
    prisma.course.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <div className="space-y-5">
      <PageHeader
        title="Usuarios"
        description="Cuentas, roles y cursos asignados. Los cambios de rol se aplican en el siguiente inicio de sesión."
      />

      <TableWrap>
        <Table>
          <THead>
            <TR>
              <TH>Usuario</TH>
              <TH>Rol</TH>
              <TH>Cursos</TH>
              <TH>Estado</TH>
              <TH>Último acceso</TH>
              <TH className="text-right">Acciones</TH>
            </TR>
          </THead>
          <TBody>
            {users.map((user) => (
              <TR key={user.id} className="hover:bg-slate-50/60">
                <TD>
                  <p className="font-medium text-slate-900">{user.name}</p>
                  <p className="text-xs text-slate-500">{user.email}</p>
                </TD>
                <TD>
                  <Badge tone={user.role === "ADMIN" ? "violet" : user.role === "COORDINATOR" ? "blue" : user.role === "THERAPIST" ? "green" : "amber"}>
                    {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}
                  </Badge>
                </TD>
                <TD className="max-w-56">
                  <span className="text-xs text-slate-600">
                    {user.role === "ADMIN" || user.role === "COORDINATOR"
                      ? "Todos"
                      : user.courseLinks.map((link) => link.course.name).join(", ") || "Sin cursos"}
                  </span>
                </TD>
                <TD>{user.active ? <Badge tone="green">Activo</Badge> : <Badge tone="slate">Inactivo</Badge>}</TD>
                <TD className="text-xs text-slate-500">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}</TD>
                <TD className="text-right">
                  <Link href={`/users/${user.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                    Editar
                  </Link>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </TableWrap>

      <Card>
        <CardHeader>
          <CardTitle>Nuevo usuario</CardTitle>
        </CardHeader>
        <CardContent>
          <UserForm mode="create" courses={courses} />
        </CardContent>
      </Card>
    </div>
  );
}
