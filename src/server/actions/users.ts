"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission, requireUser } from "@/lib/dal";
import {
  passwordChangeSchema,
  passwordResetSchema,
  userCreateSchema,
  userUpdateSchema,
} from "@/lib/validation";
import { errorResult, zodResult, type ActionResult } from "@/lib/action-result";

const BCRYPT_COST = 12;

function courseIdsFrom(formData: FormData): string[] {
  return formData.getAll("courseIds").map(String).filter(Boolean);
}

export async function createUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("users.manage");
    const parsed = userCreateSchema.safeParse({
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      password: formData.get("password"),
      active: formData.get("active") !== "false",
      courseIds: courseIdsFrom(formData),
    });
    if (!parsed.success) return zodResult(parsed.error);

    const { password, courseIds, ...data } = parsed.data;
    const passwordHash = await bcrypt.hash(password, BCRYPT_COST);
    const user = await prisma.user.create({
      data: {
        ...data,
        passwordHash,
        courseLinks: {
          create: (courseIds ?? []).map((courseId) => ({ courseId })),
        },
      },
    });
    revalidatePath("/users");
    return { ok: true, id: user.id, message: "Usuario creado." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "Ya existe un usuario con ese correo.", fieldErrors: { email: "Correo ya registrado." } };
    }
    return errorResult(error);
  }
}

export async function updateUserAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("users.manage");
    const parsed = userUpdateSchema.safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      email: formData.get("email"),
      role: formData.get("role"),
      active: formData.get("active") !== "false",
      courseIds: courseIdsFrom(formData),
    });
    if (!parsed.success) return zodResult(parsed.error);

    const { id, courseIds, ...data } = parsed.data;
    await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id }, data });
      await tx.userCourse.deleteMany({ where: { userId: id } });
      if (courseIds && courseIds.length > 0) {
        await tx.userCourse.createMany({
          data: courseIds.map((courseId) => ({ userId: id, courseId })),
        });
      }
    });
    revalidatePath("/users");
    revalidatePath(`/users/${id}`);
    return { ok: true, id, message: "Usuario actualizado." };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "Ya existe un usuario con ese correo.", fieldErrors: { email: "Correo ya registrado." } };
    }
    return errorResult(error);
  }
}

export async function resetPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("users.manage");
    const parsed = passwordResetSchema.safeParse({
      id: formData.get("id"),
      password: formData.get("password"),
    });
    if (!parsed.success) return zodResult(parsed.error);
    const passwordHash = await bcrypt.hash(parsed.data.password, BCRYPT_COST);
    await prisma.user.update({ where: { id: parsed.data.id }, data: { passwordHash } });
    return { ok: true, message: "Contraseña restablecida." };
  } catch (error) {
    return errorResult(error);
  }
}

export async function changeOwnPasswordAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser();
    const parsed = passwordChangeSchema.safeParse({
      currentPassword: formData.get("currentPassword"),
      newPassword: formData.get("newPassword"),
      confirmPassword: formData.get("confirmPassword"),
    });
    if (!parsed.success) return zodResult(parsed.error);

    const record = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
    if (!record) return { message: "Usuario no encontrado." };
    const valid = await bcrypt.compare(parsed.data.currentPassword, record.passwordHash);
    if (!valid) {
      return { message: "La contraseña actual no es correcta.", fieldErrors: { currentPassword: "Contraseña incorrecta." } };
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, BCRYPT_COST);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });
    return { ok: true, message: "Contraseña actualizada." };
  } catch (error) {
    return errorResult(error);
  }
}
