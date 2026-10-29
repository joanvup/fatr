import Link from "next/link";
import { requireUser } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { DomainCard } from "@/components/catalogs/catalog-forms";

export const metadata = { title: "Dominios de observación" };

export default async function DomainsPage() {
  const user = await requireUser();
  const canWrite = can(user.role, "catalogs.write");
  const domains = await prisma.domain.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Catálogos"
        description="Los cinco dominios de observación del formato F22 y las terapias del formato F24."
        actions={
          <div className="flex rounded-lg border border-slate-200 bg-white p-1 text-sm">
            <Link href="/catalogs/domains" className="rounded-md bg-brand-800 px-3 py-1.5 font-medium text-white">
              Dominios
            </Link>
            <Link href="/catalogs/therapies" className="rounded-md px-3 py-1.5 text-slate-600 hover:bg-slate-50">
              Terapias
            </Link>
          </div>
        }
      />

      <Card className="border-brand-100 bg-brand-50/40">
        <CardContent className="pt-4 text-sm text-slate-600">
          Estos dominios corresponden a las columnas del formato <strong>PM-04-F22</strong>. Si desactivas un dominio, deja de mostrarse en
          nuevas observaciones, pero los registros históricos se conservan.
        </CardContent>
      </Card>

      {canWrite ? (
        <div className="space-y-3">
          {domains.map((domain) => (
            <DomainCard key={domain.id} domain={domain} />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <Card key={domain.id}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-sm">
                  <span>{domain.nameEs}</span>
                  {domain.active ? <Badge tone="green">Activo</Badge> : <Badge tone="slate">Inactivo</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 text-sm text-slate-600">{domain.nameEn}</CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
