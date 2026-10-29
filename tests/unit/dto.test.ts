import { describe, expect, it } from "vitest";
import { withoutDiagnosis } from "@/lib/dto";

describe("privacidad del diagnóstico", () => {
  const student = {
    id: "s1",
    firstName: "Ana",
    diagnosis: "Dislexia",
    diagnosisUpdatedAt: new Date("2026-10-01T00:00:00Z"),
  };

  it("elimina diagnóstico y fecha de actualización", () => {
    const dto = withoutDiagnosis(student);
    expect(dto).toEqual({ id: "s1", firstName: "Ana" });
    expect("diagnosis" in dto).toBe(false);
    expect("diagnosisUpdatedAt" in dto).toBe(false);
  });

  it("no muta el registro original", () => {
    withoutDiagnosis(student);
    expect(student.diagnosis).toBe("Dislexia");
    expect(student).toHaveProperty("diagnosisUpdatedAt");
  });
});
