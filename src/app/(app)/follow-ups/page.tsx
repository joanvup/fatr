import Link from "next/link";
import { notFound } from "next/navigation";
import { Prisma } from "@prisma/client";
import { FileDown, FileText, Plus, Search } from "lucide-react";
import { getCourseScope, requireUser, studentScopeWhere } from "@/lib/dal";
import { can } from "@/lib/permissions";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/dates";
import { FOLLOW_UP_STATUS_LABELS, PAGE_SIZE } from "@/lib/constants";
import { Badge, Card, EmptyState } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableWrap, TBody, TD, TH, THead, TR, Pagination } from "@/components/ui/table";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Seguimientos por estudiante (F23)" };

export default async function FollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; page?: string }>;
}) {
  const user = await requireUser();
  if (!can(user.role, "followUps.read")) notFound();

  const scope = await getCourseScope(user);
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = params.status === "FINAL" || params.status === "DRAFT" ? params.status : "all";
  const page = Math.max(1, Number(params.page ?? "1") || 1);

  const where: Prisma.FollowUpWhereInput = {
    student: studentScopeWhere(scope),
    ...(status === "all" ? {} : { status }),
    ...(q
      ? {
          OR: [
            { student: { firstName: { contains: q } } },
            { student: { lastName: { contains: q } } },
            { student: { documentId: { contains: q } } },
            { responsibleName: { contains: q } },
          ],
        }
      : {}),
  };

  const [total, followUps] = await Promise.all([
    prisma.followUp.count({ where }),
    prisma.followUp.findMany({
      where,
      orderBy: [{ followUpDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        startDate: true,
        followUpDate: true,
        realizationDate: true,
        status: true,
        responsibleName: true,
        workArea: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            documentId: true,
            course: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const buildHref = (target: number) => {
    const query = new URLSearchParams();
    if (q) query.set("q", q);
    if (status !== "all") query.set("status", status);
    query.set("page", String(target));
    return `/follow-ups?${query.toString()}`;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Seguimientos por estudiante"
        description="Formato PM-04-F23. Documento individual con diagnóstico, proceso de seguimiento y responsables."
        actions={
          can(user.role, "followUps.write") ? (
            <Link href="/follow-ups/new">
              <Button>
                <Plus className="size-4" /> Nuevo seguimiento
              </Button>
            </Link>
          ) : null
        }
      />

      <Card className="p-4">
        <form method="get" className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label htmlFor="q" className="mb-1 block text-xs font-medium text-slate-600">
              Buscar
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input id="q" name="q" defaultValue={q} placeholder="Estudiante, documento o responsable" className="pl-9" />
            </div>
          </div>
          <div className="sm:w-48">
            <label htmlFor="status" className="mb-1 block text-xs font-medium text-slate-600">
              Estado
            </label>
            <Select id="status" name="status" defaultValue={status}>
              <option value="all">Todos</option>
              <option value="DRAFT">Borradores</option>
              <option value="FINAL">Cerrados</option>
            </Select>
          </div>
          <Button type="submit" variant="outline">
            Filtrar
          </Button>
          {q || status !== "all" ? (
            <Link href="/follow-ups" className="pb-2.5 text-xs text-brand-700 hover:underline">
              Limpiar
            </Link>
          ) : null}
        </form>
      </Card>

      {followUps.length === 0 ? (
        <Card>
          <EmptyState
            icon={<FileText className="size-10" />}
            title="Sin seguimientos"
            description="No encontramos seguimientos con los filtros actuales."
            action={
              can(user.role, "followUps.write") ? (
                <Link href="/follow-ups/new">
                  <Button size="sm">Crear el primero</Button>
                </Link>
              ) : null
            }
          />
        </Card>
      ) : (
        <>
          <TableWrap>
            <Table>
              <THead>
                <TR>
                  <TH>Estudiante</TH>
                  <TH>Curso</TH>
                  <TH>Inicio</TH>
                  <TH>Seguimiento</TH>
                  <TH>Realización</TH>
                  <TH>Responsable</TH>
                  <TH>Estado</TH>
                  <TH className="text-right">Acciones</TH>
                </TR>
              </THead>
              <TBody>
                {followUps.map((followUp) => (
                  <TR key={followUp.id} className="hover:bg-slate-50/60">
                    <TD>
                      <Link
                        href={`/students/${followUp.student.id}`}
                        className="font-medium text-slate-900 hover:text-brand-700"
                      >
                        {followUp.student.lastName}, {followUp.student.firstName}
                      </Link>
                      <p className="text-xs text-slate-400">{followUp.student.documentId}</p>
                    </TD>
                    <TD>{followUp.student.course?.name ?? "—"}</TD>
                    <TD>{formatDate(followUp.startDate)}</TD>
                    <TD>{formatDate(followUp.followUpDate)}</TD>
                    <TD>{formatDate(followUp.realizationDate)}</TD>
                    <TD>
                      <p>{followUp.responsibleName}</p>
                      {followUp.workArea ? <p className="text-xs text-slate-400">{followUp.workArea}</p> : null}
                    </TD>
                    <TD>
                      <Badge tone={followUp.status === "FINAL" ? "green" : "amber"}>
                        {FOLLOW_UP_STATUS_LABELS[followUp.status] ?? followUp.status}
                      </Badge>
                    </TD>
                    <TD>
                      <div className="flex justify-end gap-2">
                        <Link href={`/follow-ups/${followUp.id}`} className="text-xs font-medium text-brand-700 hover:underline">
                          Ver
                        </Link>
                        {can(user.role, "followUps.write") ? (
                          <Link href={`/follow-ups/${followUp.id}/edit`} className="text-xs font-medium text-slate-500 hover:underline">
                            Editar
                          </Link>
                        ) : null}
                        <Link
                          href={`/api/pdf/f23?id=${followUp.id}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:underline"
                        >
                          <FileDown className="size-3" /> PDF
                        </Link>
                      </div>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </TableWrap>
          <Pagination page={page} totalPages={totalPages} buildHref={buildHref} />
        </>
      )}
    </div>
  );
}
