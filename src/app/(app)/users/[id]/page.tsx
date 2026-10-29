import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requirePermission } from "@/lib/dal";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/constants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { UserForm, ResetPasswordForm } from "@/components/users/user-forms";

export const metadata = { title: "Editar usuario" };

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requirePermission("users.manage");

  const [user, courses] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { courseLinks: { select: { courseId: true } } },
    }),
    prisma.course.findMany({ where: { active: true }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  if (!user) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        eyebrow={<span className="text-xs text-slate-400">Usuarios</span>}
        title={user.name}
        description={`${user.email} · ${ROLE_LABELS[user.role as keyof typeof ROLE_LABELS]}`}
        actions={
          <Link href="/users">
            <Button variant="outline" size="sm">
              <ArrowLeft className="size-4" /> Volver
            </Button>
          </Link>
        }
      />

      <UserForm
        mode="edit"
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          active: user.active,
          courseIds: user.courseLinks.map((link) => link.courseId),
        }}
        courses={courses}
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-slate-400" /> Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm userId={user.id} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Información de la cuenta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-slate-600">
            <p>{ROLE_DESCRIPTIONS[user.role as keyof typeof ROLE_DESCRIPTIONS]}</p>
            <p className="text-xs text-slate-500">Creado: {formatDateTime(user.createdAt)}</p>
            <p className="text-xs text-slate-500">Último acceso: {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
