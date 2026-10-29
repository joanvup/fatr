"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { domainSchema, therapySchema } from "@/lib/validation";
import { errorResult, zodResult, type ActionResult } from "@/lib/action-result";

export async function updateDomainAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("catalogs.write");
    const parsed = domainSchema.safeParse({
      id: formData.get("id"),
      nameEs: formData.get("nameEs"),
      nameEn: formData.get("nameEn"),
      sortOrder: formData.get("sortOrder"),
      active: formData.get("active") !== "false",
    });
    if (!parsed.success) return zodResult(parsed.error);
    const { id, ...data } = parsed.data;
    await prisma.domain.update({ where: { id }, data });
    revalidatePath("/catalogs/domains");
    return { ok: true, message: "Dominio actualizado." };
  } catch (error) {
    return errorResult(error);
  }
}

export async function updateTherapyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("catalogs.write");
    const parsed = therapySchema.safeParse({
      id: formData.get("id"),
      nameEs: formData.get("nameEs"),
      kind: formData.get("kind"),
      sortOrder: formData.get("sortOrder"),
      active: formData.get("active") !== "false",
    });
    if (!parsed.success) return zodResult(parsed.error);
    const { id, ...data } = parsed.data;
    await prisma.therapy.update({ where: { id }, data });
    revalidatePath("/catalogs/therapies");
    return { ok: true, message: "Terapia actualizada." };
  } catch (error) {
    return errorResult(error);
  }
}

export async function createTherapyAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("catalogs.write");
    const nameEs = String(formData.get("nameEs") ?? "").trim();
    const kind = String(formData.get("kind") ?? "THERAPY");
    if (nameEs.length < 2) return { message: "Ingresa el nombre de la terapia.", fieldErrors: { nameEs: "Nombre demasiado corto." } };

    const baseKey = nameEs
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "terapia";

    let key = baseKey;
    let suffix = 1;
    while (await prisma.therapy.findUnique({ where: { key } })) {
      suffix += 1;
      key = `${baseKey}_${suffix}`;
    }

    const last = await prisma.therapy.aggregate({ _max: { sortOrder: true } });
    await prisma.therapy.create({
      data: {
        key,
        nameEs,
        kind: kind === "SUPPORT_AREA" ? "SUPPORT_AREA" : "THERAPY",
        sortOrder: (last._max.sortOrder ?? 0) + 1,
      },
    });
    revalidatePath("/catalogs/therapies");
    return { ok: true, message: "Terapia creada." };
  } catch (error) {
    return errorResult(error);
  }
}
