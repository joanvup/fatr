import { z } from "zod";
import { OBSERVATION_LEVELS, ROLES, SEX_OPTIONS } from "@/lib/constants";
import { isValidIsoDate, isValidTime } from "@/lib/dates";

const isoDate = z.string().refine(isValidIsoDate, "Usa una fecha válida (AAAA-MM-DD).");
const optionalIsoDate = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : undefined))
  .refine((value) => !value || isValidIsoDate(value), "Usa una fecha válida.");
const optionalText = (max = 500) =>
  z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .refine((value) => value.length <= max, `Máximo ${max} caracteres.`)
    .transform((value) => (value ? value : undefined));
const longText = (max = 8000) =>
  z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .refine((value) => value.length <= max, `Máximo ${max} caracteres.`)
    .transform((value) => (value ? value : undefined));

export const studentSchema = z.object({
  documentId: z.string().trim().min(3, "El documento debe tener al menos 3 caracteres.").max(30),
  firstName: z.string().trim().min(2, "Ingresa el nombre.").max(80),
  lastName: z.string().trim().min(2, "Ingresa los apellidos.").max(80),
  birthDate: optionalIsoDate,
  sex: z.enum(["F", "M", "X"], { message: "Selecciona el sexo." }),
  grade: z.string().trim().min(1, "Ingresa el grado.").max(40),
  courseId: optionalText(40),
  guardianName: optionalText(120),
  guardianPhone: optionalText(40),
  guardianEmail: z
    .string()
    .optional()
    .transform((value) => (value ?? "").trim())
    .refine((value) => !value || z.string().email().safeParse(value).success, "Correo no válido.")
    .transform((value) => (value ? value : undefined)),
  diagnosis: longText(4000),
  active: z.boolean().optional().default(true),
});

export const studentTherapySchema = z.object({
  studentId: z.string().min(1),
  therapyId: z.string().min(1, "Selecciona una terapia."),
  therapistId: optionalText(40),
  startDate: isoDate,
  notes: optionalText(500),
});

export const courseSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre del curso.").max(80),
  grade: z.string().trim().min(1, "Ingresa el grado.").max(40),
  year: z.coerce.number().int().min(2000).max(2100),
  active: z.boolean().optional().default(true),
});

export const userCreateSchema = z.object({
  name: z.string().trim().min(2, "Ingresa el nombre completo.").max(120),
  email: z.string().trim().toLowerCase().email("Correo no válido."),
  role: z.enum(ROLES),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
  active: z.boolean().optional().default(true),
  courseIds: z.array(z.string()).optional().default([]),
});

export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Ingresa el nombre completo.").max(120),
  email: z.string().trim().toLowerCase().email("Correo no válido."),
  role: z.enum(ROLES),
  active: z.boolean().optional().default(true),
  courseIds: z.array(z.string()).optional().default([]),
});

export const passwordResetSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres.").max(72),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "Ingresa tu contraseña actual."),
    newPassword: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres.").max(72),
    confirmPassword: z.string().min(1, "Confirma la nueva contraseña."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Las contraseñas no coinciden.",
    path: ["confirmPassword"],
  });

export const domainSchema = z.object({
  id: z.string().min(1),
  nameEs: z.string().trim().min(3, "Ingresa el nombre en español.").max(300),
  nameEn: z.string().trim().min(3, "Ingresa el nombre en inglés.").max(300),
  sortOrder: z.coerce.number().int().min(1).max(99),
  active: z.boolean().optional().default(true),
});

export const therapySchema = z.object({
  id: z.string().min(1),
  nameEs: z.string().trim().min(2, "Ingresa el nombre.").max(120),
  kind: z.enum(["THERAPY", "SUPPORT_AREA"]),
  sortOrder: z.coerce.number().int().min(1).max(99),
  active: z.boolean().optional().default(true),
});

export const cycleSchema = z
  .object({
    courseId: z.string().min(1, "Selecciona el curso."),
    year: z.coerce.number().int().min(2000).max(2100),
    period: z.coerce.number().int().min(1).max(4),
    label: optionalText(80),
    dateFrom: isoDate,
    dateTo: isoDate,
  })
  .refine((data) => data.dateTo >= data.dateFrom, {
    message: "La fecha final no puede ser anterior a la inicial.",
    path: ["dateTo"],
  });

const scoreSchema = z.object({
  domainId: z.string(),
  level: z
    .union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.null()])
    .optional()
    .transform((value) => value ?? null),
  note: optionalText(500),
});

const observationRowSchema = z.object({
  studentId: z.string().min(1),
  observationDate: optionalIsoDate,
  parentMeetingDate: optionalIsoDate,
  parentAttended: z.boolean().optional().default(false),
  studentMeetingDate: optionalIsoDate,
  diagnosisNote: longText(2000),
  nextFollowUpDate: optionalIsoDate,
  scores: z.array(scoreSchema),
});

export const observationSaveSchema = z.object({
  cycleId: z.string().min(1),
  rows: z.array(observationRowSchema).min(1),
});

export const followUpSchema = z.object({
  id: z.string().optional(),
  studentId: z.string().min(1, "Selecciona el estudiante."),
  cycleLabel: optionalText(80),
  startDate: isoDate,
  followUpDate: isoDate,
  realizationDate: isoDate,
  diagnosisSnapshot: longText(4000),
  descriptionInitial: longText(8000),
  strategies: longText(8000),
  achievements: longText(8000),
  followUpNotes: longText(8000),
  responsibleName: z.string().trim().min(2, "Ingresa el responsable.").max(120),
  workArea: optionalText(120),
  counselorName: optionalText(120),
  status: z.enum(["DRAFT", "FINAL"]).optional().default("DRAFT"),
});

export const attendanceSchema = z
  .object({
    studentId: z.string().min(1, "Selecciona el estudiante."),
    therapyId: z.string().min(1, "Selecciona la terapia o área."),
    date: isoDate,
    startTime: z.string().refine(isValidTime, "Hora inicial no válida."),
    endTime: z.string().refine(isValidTime, "Hora final no válida."),
    professionalId: z.string().min(1, "Selecciona el profesional."),
    notes: optionalText(1000),
    professionalSignature: z.string().optional(),
    guardianSignature: z.string().optional(),
    signerGuardianName: optionalText(120),
  })
  .refine((data) => data.endTime > data.startTime, {
    message: "La hora final debe ser posterior a la inicial.",
    path: ["endTime"],
  });

export const settingsSchema = z.object({
  institutionName: z.string().trim().min(2).max(120),
  schoolYear: z.string().trim().regex(/^\d{4}$/, "Usa un año de 4 dígitos."),
  logoData: z.string().optional(),
  removeLogo: z.boolean().optional().default(false),
  requireSignature: z.boolean().optional().default(false),
  forms: z.array(
    z.object({
      key: z.enum(["f22", "f23", "f24", "f25"]),
      code: z.string().trim().min(3).max(30),
      version: z.string().trim().min(1).max(10),
      validity: z.string().trim().min(4).max(20),
      rowsPerPage: z.coerce.number().int().min(5).max(40).optional(),
    }),
  ),
});

export const studentImportRowSchema = z.object({
  documentId: z.string().trim().min(3, "El documento debe tener al menos 3 caracteres."),
  firstName: z.string().trim().min(2, "Ingresa el nombre."),
  lastName: z.string().trim().min(2, "Ingresa los apellidos."),
  birthDate: optionalIsoDate,
  sex: z.enum(SEX_OPTIONS.map((option) => option.value) as [string, ...string[]]).optional(),
  grade: z.string().trim().min(1, "Ingresa el grado."),
  courseName: optionalText(80),
  guardianName: optionalText(120),
  guardianPhone: optionalText(40),
  guardianEmail: optionalText(120),
  diagnosis: optionalText(4000),
});

export const attendanceImportRowSchema = z.object({
  date: isoDate,
  documentId: z.string().trim().min(3, "El documento debe tener al menos 3 caracteres."),
  therapyName: z.string().trim().min(2, "Indica la terapia o área."),
  startTime: z.string().refine(isValidTime, "Hora inicial no válida."),
  endTime: z.string().refine(isValidTime, "Hora final no válida."),
  professionalEmail: z.string().trim().toLowerCase().email("Correo del profesional no válido."),
  notes: optionalText(1000),
});

export const assignmentImportRowSchema = z.object({
  documentId: z.string().trim().min(3, "El documento debe tener al menos 3 caracteres."),
  therapyName: z.string().trim().min(2, "Indica la terapia o área."),
  therapistEmail: optionalText(120),
  startDate: isoDate,
});

export const OBSERVATION_LEVEL_VALUES = OBSERVATION_LEVELS.map((level) => level.value);
