import { describe, expect, it } from "vitest";
import { can, canAny, seesAllCourses } from "@/lib/permissions";

describe("matriz de permisos", () => {
  it("administración tiene acceso total", () => {
    expect(can("ADMIN", "users.manage")).toBe(true);
    expect(can("ADMIN", "settings.manage")).toBe(true);
    expect(can("ADMIN", "data.import")).toBe(true);
    expect(can("ADMIN", "followUps.write")).toBe(true);
  });

  it("coordinación gestiona academia y reportes, sin usuarios ni configuración", () => {
    expect(can("COORDINATOR", "courses.write")).toBe(true);
    expect(can("COORDINATOR", "observations.finalize")).toBe(true);
    expect(can("COORDINATOR", "data.import")).toBe(true);
    expect(can("COORDINATOR", "users.manage")).toBe(false);
    expect(can("COORDINATOR", "settings.manage")).toBe(false);
  });

  it("terapeuta no importa datos ni administra catálogos", () => {
    expect(can("THERAPIST", "students.viewDiagnosis")).toBe(true);
    expect(can("THERAPIST", "followUps.write")).toBe(true);
    expect(can("THERAPIST", "data.export")).toBe(true);
    expect(can("THERAPIST", "data.import")).toBe(false);
    expect(can("THERAPIST", "catalogs.write")).toBe(false);
  });

  it("docencia no accede a seguimientos F23 ni a datos privados", () => {
    expect(can("TEACHER", "observations.write")).toBe(true);
    expect(can("TEACHER", "students.viewDiagnosis")).toBe(false);
    expect(can("TEACHER", "followUps.read")).toBe(false);
    expect(can("TEACHER", "data.export")).toBe(false);
    expect(can("TEACHER", "students.write")).toBe(false);
  });

  it("sin rol o con rol desconocido no concede permisos", () => {
    expect(can(undefined, "students.read")).toBe(false);
    expect(can("STUDENT", "students.read")).toBe(false);
  });

  it("canAny y alcance global se calculan juntos", () => {
    expect(canAny("TEACHER", ["followUps.read", "observations.read"])).toBe(true);
    expect(canAny("TEACHER", ["followUps.read", "data.export"])).toBe(false);
    expect(seesAllCourses("ADMIN")).toBe(true);
    expect(seesAllCourses("COORDINATOR")).toBe(true);
    expect(seesAllCourses("THERAPIST")).toBe(false);
    expect(seesAllCourses("TEACHER")).toBe(false);
  });
});
