import "server-only";
import { prisma } from "@/lib/db";
import { settingKey, type FormKey } from "@/lib/constants";

export const DEFAULT_SETTINGS: Record<string, string> = {
  "institution.name": "LEARNING CENTER",
  "institution.logo": "",
  "school.year": String(new Date().getFullYear()),
  "attendance.requireSignature": "false",
  "forms.f22.code": "PM-04-F22",
  "forms.f22.version": "1",
  "forms.f22.validity": "17/09/21",
  "forms.f22.rowsPerPage": "20",
  "forms.f23.code": "PM-04-F23",
  "forms.f23.version": "1",
  "forms.f23.validity": "17/09/21",
  "forms.f24.code": "PM-04-F24",
  "forms.f24.version": "1",
  "forms.f24.validity": "17/09/21",
  "forms.f24.rowsPerPage": "8",
  "forms.f25.code": "PM-04-F25",
  "forms.f25.version": "1",
  "forms.f25.validity": "17/09/21",
  "forms.f25.rowsPerPage": "12",
};

export type SettingsMap = Record<string, string>;

export async function getSettings(): Promise<SettingsMap> {
  const rows = await prisma.setting.findMany();
  const stored = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return { ...DEFAULT_SETTINGS, ...stored };
}

export function institutionName(settings: SettingsMap) {
  return settings["institution.name"] || DEFAULT_SETTINGS["institution.name"];
}

export function institutionLogo(settings: SettingsMap) {
  return settings["institution.logo"] || "/brand/logo.png";
}

export function requiresSignature(settings: SettingsMap) {
  return settings["attendance.requireSignature"] === "true";
}

export type FormMeta = {
  code: string;
  version: string;
  validity: string;
  rowsPerPage: number;
};

export function formMeta(settings: SettingsMap, form: FormKey): FormMeta {
  const fallback = DEFAULT_SETTINGS[settingKey(form, "code")];
  return {
    code: settings[settingKey(form, "code")] || fallback,
    version: settings[settingKey(form, "version")] || "1",
    validity: settings[settingKey(form, "validity")] || "17/09/21",
    rowsPerPage: Number(settings[settingKey(form, "rowsPerPage")] || 20) || 20,
  };
}
