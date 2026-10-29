import { describe, expect, it } from "vitest";
import { filterStudents, normalizeSearch, studentOptionLabel } from "@/lib/student-search";

const students = [
  { id: "1", name: "Martínez, Sofía", documentId: "1001", courseName: "Transición A" },
  { id: "2", name: "Muñoz, Mateo", documentId: "2001", courseName: "Primaria 3° A" },
  { id: "3", name: "García, Valeria", documentId: "3001", courseName: "Primaria 5° A" },
];

describe("búsqueda de estudiantes", () => {
  it("normaliza mayúsculas y diacríticos", () => {
    expect(normalizeSearch("  Martínez, SOFÍA ")).toBe("martinez, sofia");
    expect(normalizeSearch("Transición")).toBe("transicion");
  });

  it("devuelve la misma lista cuando la consulta está vacía", () => {
    expect(filterStudents(students, "")).toBe(students);
    expect(filterStudents(students, "   ")).toBe(students);
  });

  it("encuentra por nombre sin tildes ni mayúsculas", () => {
    expect(filterStudents(students, "sofia").map((student) => student.id)).toEqual(["1"]);
    expect(filterStudents(students, "MARTINEZ").map((student) => student.id)).toEqual(["1"]);
    expect(filterStudents(students, "munoz").map((student) => student.id)).toEqual(["2"]);
  });

  it("encuentra por documento y por curso", () => {
    expect(filterStudents(students, "1001").map((student) => student.id)).toEqual(["1"]);
    expect(filterStudents(students, "200").map((student) => student.id)).toEqual(["2"]);
    expect(filterStudents(students, "transicion").map((student) => student.id)).toEqual(["1"]);
  });

  it("combina varios tokens en cualquier orden", () => {
    expect(filterStudents(students, "martinez sofia").map((student) => student.id)).toEqual(["1"]);
    expect(filterStudents(students, "sofia 1001").map((student) => student.id)).toEqual(["1"]);
    expect(filterStudents(students, "primaria valeria").map((student) => student.id)).toEqual(["3"]);
  });

  it("no devuelve resultados sin coincidencias", () => {
    expect(filterStudents(students, "zzz")).toEqual([]);
  });

  it("no muta la lista original", () => {
    const copy = [...students];
    filterStudents(students, "sofia");
    expect(students).toEqual(copy);
  });

  it("formatea la etiqueta de la opción", () => {
    expect(studentOptionLabel(students[0])).toBe("Martínez, Sofía · 1001 · Transición A");
  });
});
