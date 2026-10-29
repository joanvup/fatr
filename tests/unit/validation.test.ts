import { describe, expect, it } from "vitest";
import {
  attendanceSchema,
  cycleSchema,
  observationSaveSchema,
  passwordChangeSchema,
  studentImportRowSchema,
  studentSchema,
} from "@/lib/validation";

const baseStudent = {
  documentId: " 9001 ",
  firstName: " Ana ",
  lastName: " Díaz ",
  sex: "F",
  grade: "5°",
};

describe("validación de estudiantes", () => {
  it("normaliza espacios y aplica valores por defecto", () => {
    const parsed = studentSchema.parse(baseStudent);
    expect(parsed.documentId).toBe("9001");
    expect(parsed.firstName).toBe("Ana");
    expect(parsed.lastName).toBe("Díaz");
    expect(parsed.active).toBe(true);
    expect(parsed.guardianEmail).toBeUndefined();
  });

  it("rechaza correos inválidos del acudiente", () => {
    const result = studentSchema.safeParse({ ...baseStudent, guardianEmail: "no-es-correo" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("guardianEmail"))).toBe(true);
    }
  });

  it("rechaza fechas de nacimiento inválidas", () => {
    expect(studentSchema.safeParse({ ...baseStudent, birthDate: "2014-13-40" }).success).toBe(false);
  });
});

describe("validación de asistencia y ciclos", () => {
  it("exige que la hora final sea posterior a la inicial", () => {
    const result = attendanceSchema.safeParse({
      studentId: "s1",
      therapyId: "t1",
      date: "2026-10-05",
      startTime: "10:00",
      endTime: "09:30",
      professionalId: "u1",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("endTime"))).toBe(true);
    }
  });

  it("impide cerrar un ciclo antes de su fecha inicial", () => {
    const result = cycleSchema.safeParse({
      courseId: "c1",
      year: 2026,
      period: 1,
      dateFrom: "2026-03-01",
      dateTo: "2026-02-01",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("dateTo"))).toBe(true);
    }
  });
});

describe("validación de observaciones", () => {
  it("solo acepta niveles 1 a 4 o vacío", () => {
    const base = {
      cycleId: "cy1",
      rows: [
        {
          studentId: "s1",
          scores: [{ domainId: "d1", level: 5 }],
        },
      ],
    };
    expect(observationSaveSchema.safeParse(base).success).toBe(false);
    expect(
      observationSaveSchema.safeParse({
        ...base,
        rows: [{ studentId: "s1", scores: [{ domainId: "d1", level: 4 }] }],
      }).success,
    ).toBe(true);
  });
});

describe("validación de contraseñas e importación", () => {
  it("exige que la confirmación coincida", () => {
    const result = passwordChangeSchema.safeParse({
      currentPassword: "actual123",
      newPassword: "nueva1234",
      confirmPassword: "otra1234",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((issue) => issue.path.includes("confirmPassword"))).toBe(true);
    }
  });

  it("devuelve mensajes en español para filas de importación", () => {
    const result = studentImportRowSchema.safeParse({
      documentId: "123",
      firstName: "A",
      lastName: "Ruiz",
      grade: "5°",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map((issue) => issue.message)).toContain("Ingresa el nombre.");
    }
  });
});
