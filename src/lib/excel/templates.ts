import ExcelJS from "exceljs";
import { addDataSheet, addMetaSheet, type ColumnDef, type ImportKind } from "@/lib/excel/common";

export const TEMPLATE_COLUMNS: Record<ImportKind, ColumnDef[]> = {
  students: [
    { header: "Documento", key: "documentId", width: 16, note: "Obligatorio. Se usa para crear o actualizar el estudiante." },
    { header: "Nombres", key: "firstName", width: 22 },
    { header: "Apellidos", key: "lastName", width: 22 },
    { header: "Fecha de nacimiento (DD/MM/AAAA)", key: "birthDate", width: 24 },
    { header: "Sexo (F/M/X)", key: "sex", width: 12, note: "F = Femenino, M = Masculino, X = Otro / no especifica." },
    { header: "Grado", key: "grade", width: 14 },
    { header: "Curso", key: "courseName", width: 22, note: "Nombre exacto del curso existente, por ejemplo: Primaria 3° A." },
    { header: "Acudiente", key: "guardianName", width: 24 },
    { header: "Teléfono del acudiente", key: "guardianPhone", width: 20 },
    { header: "Correo del acudiente", key: "guardianEmail", width: 28 },
    { header: "Diagnóstico (opcional)", key: "diagnosis", width: 36, note: "Información clínica. Visible solo para terapeutas, coordinación y administración." },
  ],
  therapies: [
    { header: "Documento del estudiante", key: "documentId", width: 18 },
    { header: "Terapia o área", key: "therapyName", width: 26, note: "Debe coincidir con una terapia activa del catálogo." },
    { header: "Correo del terapeuta (opcional)", key: "therapistEmail", width: 30 },
    { header: "Fecha de inicio (DD/MM/AAAA)", key: "startDate", width: 24 },
  ],
  attendance: [
    { header: "Fecha (DD/MM/AAAA)", key: "date", width: 18 },
    { header: "Documento del estudiante", key: "documentId", width: 18 },
    { header: "Terapia o área", key: "therapyName", width: 26 },
    { header: "Hora de inicio (HH:MM)", key: "startTime", width: 18, note: "Formato de 24 horas, por ejemplo 08:00." },
    { header: "Hora de finalización (HH:MM)", key: "endTime", width: 22 },
    { header: "Correo del profesional", key: "professionalEmail", width: 30 },
    { header: "Notas (opcional)", key: "notes", width: 36 },
  ],
};

export const TEMPLATE_TITLES: Record<ImportKind, string> = {
  students: "Estudiantes",
  therapies: "Asignación de terapias",
  attendance: "Asistencia",
};

export function buildTemplateWorkbook(kind: ImportKind) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FATR";
  workbook.created = new Date();
  addDataSheet(workbook, TEMPLATE_TITLES[kind], TEMPLATE_COLUMNS[kind], []);
  addMetaSheet(workbook, kind, TEMPLATE_COLUMNS[kind]);
  return workbook;
}
