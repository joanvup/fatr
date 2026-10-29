import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { can, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/constants";
import { getCourseScope } from "@/lib/scope";

export { courseFilter, getCourseScope, studentScopeWhere } from "@/lib/scope";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    name: session.user.name ?? "",
    email: session.user.email ?? "",
    role: (session.user.role as Role) ?? "TEACHER",
  };
});

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return null;
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  if (!user || !user.active) return null;
  return { id: user.id, name: user.name, email: user.email, role: user.role as Role };
});

export const requireUser = cache(async (): Promise<SessionUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export async function requirePermission(permission: Permission): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) {
    throw new HttpError(403, "No tienes permisos para realizar esta acción.");
  }
  return user;
}

export async function getApiUser(): Promise<SessionUser | null> {
  return getCurrentUser();
}

export async function requireApiUser(): Promise<SessionUser> {
  const user = await getApiUser();
  if (!user) throw new HttpError(401, "Sesión no válida.");
  return user;
}

export async function requireApiPermission(permission: Permission): Promise<SessionUser> {
  const user = await requireApiUser();
  if (!can(user.role, permission)) {
    throw new HttpError(403, "No tienes permisos para realizar esta acción.");
  }
  return user;
}

/** `null` significa acceso a todos los cursos. */
export async function assertCourseAccess(user: SessionUser, courseId: string | null | undefined) {
  const scope = await getCourseScope(user);
  if (scope === null) return;
  if (!courseId || !scope.includes(courseId)) {
    throw new HttpError(403, "No tienes acceso a este curso.");
  }
}

export async function assertStudentAccess(user: SessionUser, studentId: string) {
  const scope = await getCourseScope(user);
  if (scope === null) return;
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { courseId: true },
  });
  if (!student?.courseId || !scope.includes(student.courseId)) {
    throw new HttpError(403, "No tienes acceso a este estudiante.");
  }
}
