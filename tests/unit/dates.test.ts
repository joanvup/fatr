import { describe, expect, it } from "vitest";
import {
  addDaysIso,
  calculateAge,
  formatDate,
  formatDuration,
  isValidIsoDate,
  minutesBetween,
  startOfWeekIso,
  subtractDaysIso,
} from "@/lib/dates";

describe("fechas escolares", () => {
  it("calcula la edad en el día del cumpleaños", () => {
    expect(calculateAge("2014-03-12", "2026-03-11")).toBe(11);
    expect(calculateAge("2014-03-12", "2026-03-12")).toBe(12);
    expect(calculateAge(null, "2026-03-12")).toBeNull();
    expect(calculateAge("2026-03-13", "2026-03-12")).toBeNull();
  });

  it("formatea a dd/MM/yyyy sin corrimiento de zona horaria", () => {
    expect(formatDate("2026-10-05")).toBe("05/10/2026");
    expect(formatDate("")).toBe("—");
    expect(formatDate("2026-10-05", "")).toBe("05/10/2026");
  });

  it("valida fechas ISO estrictas", () => {
    expect(isValidIsoDate("2026-10-05")).toBe(true);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("05/10/2026")).toBe(false);
    expect(isValidIsoDate(null)).toBe(false);
  });

  it("suma y resta días conservando el formato ISO", () => {
    expect(addDaysIso("2026-02-28", 1)).toBe("2026-03-01");
    expect(subtractDaysIso("2026-03-01", 1)).toBe("2026-02-28");
    expect(startOfWeekIso("2026-10-29")).toBe("2026-10-26");
  });

  it("calcula duraciones de sesión", () => {
    expect(minutesBetween("08:00", "08:45")).toBe(45);
    expect(minutesBetween("10:00", "09:00")).toBeNull();
    expect(minutesBetween("8:00", "9:00")).toBeNull();
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(null)).toBe("—");
  });
});
