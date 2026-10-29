"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/dal";
import { courseSchema } from "@/lib/validation";
import { errorResult, zodResult, type ActionResult } from "@/lib/action-result";

function parseCourse(formData: FormData) {
  return courseSchema.safeParse({
    name: formData.get("name"),
    grade: formData.get("grade"),
    year: formData.get("year"),
    active: formData.get("active") !== "false",
  });
}

export async function createCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("courses.write");
    const parsed = parseCourse(formData);
    if (!parsed.success) return zodResult(parsed.error);

    const course = await prisma.course.create({ data: parsed.data });
    revalidatePath("/courses");
    return { ok: true, id: course.id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "Ya existe un curso con ese nombre para el año indicado." };
    }
    return errorResult(error);
  }
}

export async function updateCourseAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  try {
    await requirePermission("courses.write");
    const id = String(formData.get("id") ?? "");
    const parsed = parseCourse(formData);
    if (!parsed.success) return zodResult(parsed.error);

    await prisma.course.update({ where: { id }, data: parsed.data });
    revalidatePath("/courses");
    revalidatePath(`/courses/${id}`);
    return { ok: true, id };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { message: "Ya existe un curso con ese nombre para el año indicado." };
    }
    return errorResult(error);
  }
}

export async function toggleCourseActiveAction(formData: FormData): Promise<void> {
  await requirePermission("courses.write");
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  await prisma.course.update({ where: { id }, data: { active } });
  revalidatePath("/courses");
  revalidatePath(`/courses/${id}`);
}

export async function assignUserCourseAction(formData: FormData): Promise<void> {
  await requirePermission("courses.write");
  const courseId = String(formData.get("courseId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!courseId || !userId) return;
  await prisma.userCourse.upsert({
    where: { userId_courseId: { userId, courseId } },
    update: {},
    create: { userId, courseId },
  });
  revalidatePath(`/courses/${courseId}`);
}

export async function removeUserCourseAction(formData: FormData): Promise<void> {
  await requirePermission("courses.write");
  const courseId = String(formData.get("courseId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  if (!courseId || !userId) return;
  await prisma.userCourse.deleteMany({ where: { userId, courseId } });
  revalidatePath(`/courses/${courseId}`);
}
