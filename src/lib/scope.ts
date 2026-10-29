import "server-only";
import { prisma } from "@/lib/db";
import { seesAllCourses } from "@/lib/permissions";
import type { Role } from "@/lib/constants";

export type ScopeUser = { id: string; role: Role };

/** `null` significa acceso a todos los cursos. */
export async function getCourseScope(user: ScopeUser): Promise<string[] | null> {
  if (seesAllCourses(user.role)) return null;
  const links = await prisma.userCourse.findMany({
    where: { userId: user.id },
    select: { courseId: true },
  });
  return links.map((link) => link.courseId);
}

export function courseFilter(scope: string[] | null): { courseId?: { in: string[] } } {
  return scope === null ? {} : { courseId: { in: scope } };
}

export function studentScopeWhere(scope: string[] | null) {
  return scope === null ? {} : { courseId: { in: scope } };
}
