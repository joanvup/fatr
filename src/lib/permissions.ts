import type { Role } from "@/lib/constants";

export const PERMISSIONS = [
  "users.manage",
  "settings.manage",
  "courses.read",
  "courses.write",
  "catalogs.write",
  "students.read",
  "students.write",
  "students.writeAcrossCourses",
  "students.viewDiagnosis",
  "observations.read",
  "observations.write",
  "observations.finalize",
  "followUps.read",
  "followUps.write",
  "attention.read",
  "attention.write",
  "attendance.read",
  "attendance.write",
  "data.import",
  "data.export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ALL: Permission[] = [...PERMISSIONS];

const MATRIX: Record<Role, Permission[]> = {
  ADMIN: ALL,
  COORDINATOR: [
    "courses.read",
    "courses.write",
    "catalogs.write",
    "students.read",
    "students.write",
    "students.writeAcrossCourses",
    "students.viewDiagnosis",
    "observations.read",
    "observations.write",
    "observations.finalize",
    "followUps.read",
    "followUps.write",
    "attention.read",
    "attention.write",
    "attendance.read",
    "attendance.write",
    "data.import",
    "data.export",
  ],
  THERAPIST: [
    "courses.read",
    "students.read",
    "students.write",
    "students.viewDiagnosis",
    "observations.read",
    "observations.write",
    "followUps.read",
    "followUps.write",
    "attention.read",
    "attendance.read",
    "attendance.write",
    "data.export",
  ],
  TEACHER: [
    "courses.read",
    "students.read",
    "observations.read",
    "observations.write",
    "attention.read",
    "attendance.read",
  ],
};

export function can(role: Role | string | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role as Role]?.includes(permission) ?? false;
}

export function canAny(role: Role | string | undefined, permissions: Permission[]): boolean {
  return permissions.some((permission) => can(role, permission));
}

export function seesAllCourses(role: Role | string | undefined): boolean {
  return role === "ADMIN" || role === "COORDINATOR";
}
