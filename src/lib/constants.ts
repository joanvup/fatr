export const ROLES = ["ADMIN", "COORDINATOR", "THERAPIST", "TEACHER"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administración",
  COORDINATOR: "Coordinación",
  THERAPIST: "Terapeuta",
  TEACHER: "Docente",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Acceso total al sistema y a la configuración.",
  COORDINATOR: "Gestión académica y reportes de todos los cursos.",
  THERAPIST: "Trabajo terapéutico sobre los cursos asignados.",
  TEACHER: "Observación formativa de los cursos asignados.",
};

export const OBSERVATION_LEVELS = [
  { value: 1, label: "Requiere apoyo", short: "1" },
  { value: 2, label: "En proceso", short: "2" },
  { value: 3, label: "Logrado", short: "3" },
  { value: 4, label: "Destacado", short: "4" },
] as const;

export const LEVEL_LABELS: Record<number, string> = {
  1: "Requiere apoyo",
  2: "En proceso",
  3: "Logrado",
  4: "Destacado",
};

export const COURSE_PERIODS = ["1", "2", "3", "4"] as const;
export type CoursePeriod = (typeof COURSE_PERIODS)[number];

export const PERIOD_LABELS: Record<string, string> = {
  "1": "Periodo 1",
  "2": "Periodo 2",
  "3": "Periodo 3",
  "4": "Periodo 4",
};

export const OBSERVATION_STATUS = ["DRAFT", "FINAL"] as const;
export const OBSERVATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "En borrador",
  FINAL: "Finalizado",
};

export const FOLLOW_UP_STATUS = ["DRAFT", "FINAL"] as const;
export const FOLLOW_UP_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  FINAL: "Cerrado",
};

export const THERAPY_KIND_LABELS: Record<string, string> = {
  THERAPY: "Terapia",
  SUPPORT_AREA: "Área de apoyo",
};

export const SIGNATURE_ROLE_LABELS: Record<string, string> = {
  PROFESSIONAL: "Profesional",
  GUARDIAN: "Estudiante / acudiente",
};

export const SEX_OPTIONS = [
  { value: "F", label: "Femenino" },
  { value: "M", label: "Masculino" },
  { value: "X", label: "Otro / no especifica" },
] as const;

export const SETTING_KEYS = {
  institutionName: "institution.name",
  institutionLogo: "institution.logo",
  schoolYear: "school.year",
  requireSignature: "attendance.requireSignature",
} as const;

export const FORM_KEYS = ["f22", "f23", "f24", "f25"] as const;
export type FormKey = (typeof FORM_KEYS)[number];

export const FORM_TITLES: Record<FormKey, string> = {
  f22: "Observaciones por curso",
  f23: "Seguimiento por estudiante",
  f24: "Relación de atención",
  f25: "Registro de asistencia",
};

export const MAX_SIGNATURE_BYTES = 200 * 1024;
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const PAGE_SIZE = 25;

export function settingKey(form: FormKey, field: "code" | "version" | "validity" | "rowsPerPage") {
  return `forms.${form}.${field}`;
}
