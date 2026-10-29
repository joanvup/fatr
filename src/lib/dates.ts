import {
  addDays,
  differenceInYears,
  format,
  isValid,
  parseISO,
  startOfMonth,
  startOfWeek,
  subDays,
} from "date-fns";
import { es } from "date-fns/locale";

export function todayIso(): string {
  return toIsoDate(new Date());
}

export function toIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

export function isValidIsoDate(value: string | null | undefined): boolean {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && isValid(parseISO(value));
}

export function formatDate(value: string | null | undefined, fallback = "—"): string {
  const date = parseIsoDate(value);
  return date ? format(date, "dd/MM/yyyy", { locale: es }) : fallback;
}

export function formatDateLong(value: string | null | undefined, fallback = "—"): string {
  const date = parseIsoDate(value);
  return date ? format(date, "d 'de' MMMM 'de' yyyy", { locale: es }) : fallback;
}

export function formatWeekday(value: string | null | undefined, fallback = "—"): string {
  const date = parseIsoDate(value);
  return date ? format(date, "EEEE d 'de' MMMM", { locale: es }) : fallback;
}

export function formatDateTime(value: Date | string | null | undefined, fallback = "—"): string {
  if (!value) return fallback;
  const date = typeof value === "string" ? new Date(value) : value;
  return isValid(date) ? format(date, "dd/MM/yyyy HH:mm", { locale: es }) : fallback;
}

export function calculateAge(birthDate: string | null | undefined, at: string = todayIso()): number | null {
  const birth = parseIsoDate(birthDate);
  const reference = parseIsoDate(at);
  if (!birth || !reference || birth > reference) return null;
  return differenceInYears(reference, birth);
}

export function addDaysIso(value: string, days: number): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  return toIsoDate(addDays(date, days));
}

export function subtractDaysIso(value: string, days: number): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  return toIsoDate(subDays(date, days));
}

export function startOfWeekIso(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  return toIsoDate(startOfWeek(date, { weekStartsOn: 1 }));
}

export function startOfMonthIso(value: string): string {
  const date = parseIsoDate(value);
  if (!date) return value;
  return toIsoDate(startOfMonth(date));
}

export function minutesBetween(start: string, end: string): number | null {
  if (!/^\d{2}:\d{2}$/.test(start) || !/^\d{2}:\d{2}$/.test(end)) return null;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const diff = eh * 60 + em - (sh * 60 + sm);
  return diff > 0 ? diff : null;
}

export function isValidTime(value: string | null | undefined): boolean {
  if (!value || !/^\d{2}:\d{2}$/.test(value)) return false;
  const [h, m] = value.split(":").map(Number);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return "—";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function weekdayName(date: Date): string {
  return format(date, "EEEE", { locale: es });
}
