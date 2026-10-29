"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { FORM_KEYS, settingKey } from "@/lib/constants";
import { settingsSchema } from "@/lib/validation";
import { errorResult, zodResult, type ActionResult } from "@/lib/action-result";
import { MAX_SIGNATURE_BYTES } from "@/lib/constants";

const ALLOWED_LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function updateSettingsAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("settings.manage");

    const forms = FORM_KEYS.map((key) => ({
      key,
      code: formData.get(`code-${key}`),
      version: formData.get(`version-${key}`),
      validity: formData.get(`validity-${key}`),
      rowsPerPage:
        key === "f23" ? undefined : Number(formData.get(`rows-${key}`) ?? 20),
    }));

    const parsed = settingsSchema.safeParse({
      institutionName: formData.get("institutionName"),
      schoolYear: formData.get("schoolYear"),
      requireSignature: formData.get("requireSignature") === "on",
      removeLogo: formData.get("removeLogo") === "on",
      forms,
    });
    if (!parsed.success) return zodResult(parsed.error);

    const entries: [string, string][] = [
      ["institution.name", parsed.data.institutionName],
      ["school.year", parsed.data.schoolYear],
      ["attendance.requireSignature", parsed.data.requireSignature ? "true" : "false"],
    ];

    if (parsed.data.removeLogo) {
      entries.push(["institution.logo", ""]);
    } else {
      const file = formData.get("logo");
      if (file instanceof File && file.size > 0) {
        if (!ALLOWED_LOGO_TYPES.includes(file.type)) {
          return { message: "El logo debe ser PNG, JPG o WEBP.", fieldErrors: { logo: "Formato no permitido." } };
        }
        if (file.size > MAX_SIGNATURE_BYTES) {
          return { message: "El logo no puede superar 200 KB.", fieldErrors: { logo: "Archivo demasiado grande." } };
        }
        const buffer = Buffer.from(await file.arrayBuffer());
        entries.push(["institution.logo", `data:${file.type};base64,${buffer.toString("base64")}`]);
      }
    }

    for (const form of parsed.data.forms) {
      entries.push([settingKey(form.key, "code"), form.code]);
      entries.push([settingKey(form.key, "version"), form.version]);
      entries.push([settingKey(form.key, "validity"), form.validity]);
      if (form.rowsPerPage) entries.push([settingKey(form.key, "rowsPerPage"), String(form.rowsPerPage)]);
    }

    await prisma.$transaction(
      entries.map(([key, value]) =>
        prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
      ),
    );

    revalidatePath("/", "layout");
    return { ok: true, message: "Configuración guardada." };
  } catch (error) {
    return errorResult(error);
  }
}
