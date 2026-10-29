import type { Prisma } from "@prisma/client";

type Diagnosable = { diagnosis?: string | null; diagnosisUpdatedAt?: Date | null };

/** Elimina el diagnóstico clínico de un registro antes de enviarlo al cliente. */
export function withoutDiagnosis<T extends Diagnosable>(record: T): Omit<T, "diagnosis" | "diagnosisUpdatedAt"> {
  const copy: Record<string, unknown> = { ...record };
  delete copy.diagnosis;
  delete copy.diagnosisUpdatedAt;
  return copy as Omit<T, "diagnosis" | "diagnosisUpdatedAt">;
}

export const STUDENT_BASE_SELECT = {
  id: true,
  documentId: true,
  firstName: true,
  lastName: true,
  birthDate: true,
  sex: true,
  grade: true,
  guardianName: true,
  guardianPhone: true,
  guardianEmail: true,
  active: true,
  courseId: true,
  course: { select: { id: true, name: true, grade: true } },
} satisfies Prisma.StudentSelect;

export const STUDENT_PRIVATE_SELECT = {
  ...STUDENT_BASE_SELECT,
  diagnosis: true,
  diagnosisUpdatedAt: true,
} satisfies Prisma.StudentSelect;

export function studentSelect(includeDiagnosis: boolean) {
  return includeDiagnosis ? STUDENT_PRIVATE_SELECT : STUDENT_BASE_SELECT;
}

export const ATTENDANCE_SELECT = {
  id: true,
  date: true,
  durationMinutes: true,
  startTime: true,
  endTime: true,
  professionalName: true,
  notes: true,
  createdAt: true,
  therapy: { select: { id: true, nameEs: true, kind: true } },
  signatures: { select: { id: true, role: true, signerName: true } },
} satisfies Prisma.AttendanceSelect;

export function toAttendanceDto(
  attendance: Prisma.AttendanceGetPayload<{ select: typeof ATTENDANCE_SELECT }>,
) {
  return {
    ...attendance,
    signatures: attendance.signatures.map((signature) => ({
      id: signature.id,
      role: signature.role,
      signerName: signature.signerName,
      url: `/api/signatures/${signature.id}`,
    })),
  };
}
