"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/dates";
import { Badge, Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Table, TableWrap, TBody, TD, TH, THead, TR } from "@/components/ui/table";

type ImportKind = "students" | "therapies" | "attendance";
type PreviewError = { rowNumber: number; messages: string[] };
type PreviewRow = { rowNumber: number; data: Record<string, unknown> };
type PreviewState = {
  batchId: string;
  kind: ImportKind;
  filename: string;
  total: number;
  valid: number;
  invalid: number;
  errors: PreviewError[];
  preview: PreviewRow[];
};
type Issue = { path: string; message: string };

const KIND_OPTIONS: { value: ImportKind; label: string; template: string }[] = [
  { value: "students", label: "Estudiantes", template: "plantilla-estudiantes.xlsx" },
  { value: "therapies", label: "Asignación de terapias", template: "plantilla-asignacion-de-terapias.xlsx" },
  { value: "attendance", label: "Asistencia", template: "plantilla-asistencia.xlsx" },
];

const PREVIEW_FIELDS: Record<ImportKind, { key: string; label: string }[]> = {
  students: [
    { key: "documentId", label: "Documento" },
    { key: "firstName", label: "Nombres" },
    { key: "lastName", label: "Apellidos" },
    { key: "grade", label: "Grado" },
    { key: "courseName", label: "Curso" },
  ],
  therapies: [
    { key: "documentId", label: "Documento" },
    { key: "therapyName", label: "Terapia o área" },
    { key: "therapistEmail", label: "Terapeuta" },
    { key: "startDate", label: "Fecha de inicio" },
  ],
  attendance: [
    { key: "date", label: "Fecha" },
    { key: "documentId", label: "Documento" },
    { key: "therapyName", label: "Terapia o área" },
    { key: "startTime", label: "Inicio" },
    { key: "endTime", label: "Fin" },
  ],
};

function display(value: unknown) {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? formatDate(text, text) : text;
}

export function ImportPanel() {
  const router = useRouter();
  const [fileKey, setFileKey] = useState(0);
  const [kind, setKind] = useState<ImportKind>("students");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [pending, setPending] = useState(false);

  const activeKind = KIND_OPTIONS.find((option) => option.value === kind) ?? KIND_OPTIONS[0];

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (!file) {
      toast.error("Selecciona un archivo Excel (.xlsx).");
      return;
    }
    setPending(true);
    setPreview(null);
    setIssues([]);
    try {
      const body = new FormData();
      body.set("kind", kind);
      body.set("file", file);
      const response = await fetch("/api/import/preview", { method: "POST", body });
      const payload = (await response.json().catch(() => ({}))) as PreviewState & {
        error?: string;
        issues?: Issue[];
      };
      if (!response.ok) {
        if (Array.isArray(payload.issues)) setIssues(payload.issues);
        toast.error(payload.error ?? "No se pudo analizar el archivo.");
        return;
      }
      setPreview(payload);
      if (payload.errors.length > 0) {
        toast.warning(`Se encontraron ${payload.errors.length} fila(s) con errores.`);
      } else {
        toast.success(`Archivo válido: ${payload.valid} fila(s) listas para importar.`);
      }
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  async function commit() {
    if (!preview || pending) return;
    setPending(true);
    try {
      const response = await fetch("/api/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: preview.batchId }),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        error?: string;
        created?: number;
        updated?: number;
      };
      if (!response.ok) {
        toast.error(payload.error ?? "No se pudo confirmar la importación.");
        return;
      }
      toast.success(
        `Importación completada: ${payload.created ?? 0} registro(s) creados y ${payload.updated ?? 0} actualizados.`,
      );
      setPreview(null);
      setFile(null);
      setFileKey((value) => value + 1);
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar desde Excel</CardTitle>
        <p className="text-xs text-slate-500">
          Descarga la plantilla de {activeKind.label.toLowerCase()}, diligénciala sin cambiar los encabezados y cárgala
          aquí. Primero se valida el archivo completo; nada se guarda hasta que confirmes.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={analyze} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <Field label="Tipo de importación" htmlFor="import-kind" className="sm:w-60">
            <Select
              id="import-kind"
              value={kind}
              onChange={(event) => {
                setKind(event.target.value as ImportKind);
                setPreview(null);
                setIssues([]);
              }}
              disabled={pending}
            >
              {KIND_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field
            label="Archivo (.xlsx)"
            htmlFor="import-file"
            hint="Máximo 10 MB · hasta 1000 filas."
            className="flex-1"
          >
            <Input
              key={fileKey}
              id="import-file"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={(event) => {
                setFile(event.target.files?.[0] ?? null);
                setPreview(null);
                setIssues([]);
              }}
              disabled={pending}
              className="h-10 py-1.5"
            />
          </Field>
          <Button type="submit" disabled={pending} className="sm:mb-0">
            <Upload className="size-4" /> {pending ? "Analizando…" : "Analizar"}
          </Button>
        </form>

        {issues.length > 0 ? (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Revisa los datos enviados:</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
              {issues.map((issue, index) => (
                <li key={`${issue.path}-${index}`}>
                  {issue.path || "archivo"}: {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {preview ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <FileSpreadsheet className="size-4 text-slate-400" />
              <span className="font-medium text-slate-800">{preview.filename}</span>
              <span className="text-slate-500">
                {preview.total} fila(s) · {preview.valid} válida(s)
              </span>
              {preview.errors.length > 0 ? (
                <Badge tone="red">
                  <AlertTriangle className="size-3" /> {preview.errors.length} con error
                </Badge>
              ) : (
                <Badge tone="green">
                  <CheckCircle2 className="size-3" /> Sin errores
                </Badge>
              )}
            </div>

            {preview.errors.length > 0 ? (
              <TableWrap className="max-h-72">
                <Table>
                  <THead>
                    <TR>
                      <TH className="w-20">Fila</TH>
                      <TH>Errores</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {preview.errors.map((error) => (
                      <TR key={error.rowNumber}>
                        <TD className="align-top font-mono text-xs">{error.rowNumber}</TD>
                        <TD className="text-xs text-red-700">{error.messages.join(" · ")}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              </TableWrap>
            ) : null}

            {preview.preview.length > 0 ? (
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Vista previa ({preview.preview.length} de {preview.valid} fila(s))
                </p>
                <TableWrap>
                  <Table>
                    <THead>
                      <TR>
                        <TH className="w-14">Fila</TH>
                        {PREVIEW_FIELDS[preview.kind].map((field) => (
                          <TH key={field.key}>{field.label}</TH>
                        ))}
                      </TR>
                    </THead>
                    <TBody>
                      {preview.preview.map((row) => (
                        <TR key={row.rowNumber}>
                          <TD className="font-mono text-xs text-slate-400">{row.rowNumber}</TD>
                          {PREVIEW_FIELDS[preview.kind].map((field) => (
                            <TD key={field.key} className="text-xs">
                              {display(row.data[field.key])}
                            </TD>
                          ))}
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                </TableWrap>
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
              <p className="text-xs text-slate-500">
                {preview.errors.length > 0
                  ? "Corrige el archivo y vuelve a analizarlo para poder confirmar."
                  : "Al confirmar, los registros existentes se actualizarán y los nuevos se crearán."}
              </p>
              <Button onClick={commit} disabled={pending || preview.errors.length > 0}>
                <CheckCircle2 className="size-4" />
                {pending ? "Importando…" : "Confirmar importación"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
