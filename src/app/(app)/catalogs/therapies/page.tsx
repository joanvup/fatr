import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NewTherapyForm, TherapyCard } from "@/components/catalogs/catalog-forms";
import { THERAPY_KIND_LABELS } from "@/lib/constants";

export const metadata = { title: "Terapias y áreas de apoyo" };

export default async function TherapiesPage() {
  const user = await requireUser();
  const canWrite = can(user.role, "catalogs.write");
  const therapies = await prisma.therapy.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catálogos"
        description="Terapias y áreas de apoyo que se asignan a los estudiantes y se registran en F24 y F25."
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
            <Link href="/catalogs/domains" className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50">
              Dominios
            </Link>
            <Link href="/catalogs/therapies" className="rounded-md bg-brand-800 px-3 py-1.5 font-medium text-white">
              Terapias
            </Link>
          </div>
        }
      />

      {canWrite ? (
        <div className="space-y-3">
          {therapies.map((therapy) => (
            <TherapyCard key={therapy.id} therapy={therapy} />
          ))}
          <Card>
            <CardHeader>
              <CardTitle>Agregar terapia o área</CardTitle>
            </CardHeader>
            <CardContent>
              <NewTherapyForm />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-3">
          {therapies.map((therapy) => (
            <Card key={therapy.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-sm">
                  <span>{therapy.nameEs}</span>
                  {therapy.active ? <Badge tone="green">Activo</Badge> : <Badge tone="slate">Inactivo</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2 text-xs text-slate-500">{THERAPY_KIND_LABELS[therapy.kind]}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
