import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/db";
import { getCourseScope } from "@/lib/scope";
import { getAttentionSummary } from "@/lib/metrics";

async function reset() {
  await prisma.$transaction([
    prisma.signature.deleteMany(),
    prisma.attendance.deleteMany(),
    prisma.observationScore.deleteMany(),
    prisma.observation.deleteMany(),
    prisma.observationCycle.deleteMany(),
    prisma.followUp.deleteMany(),
    prisma.studentTherapy.deleteMany(),
    prisma.student.deleteMany(),
    prisma.userCourse.deleteMany(),
    prisma.domain.deleteMany(),
    prisma.therapy.deleteMany(),
    prisma.course.deleteMany(),
    prisma.importBatch.deleteMany(),
    prisma.setting.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function baseFixtures() {
  const user = await prisma.user.create({
    data: { name: "Terapeuta Prueba", email: "terapeuta@test.local", passwordHash: "hash", role: "THERAPIST" },
  });
  const courseA = await prisma.course.create({
    data: { name: "Curso A", grade: "3°", year: 2026 },
  });
  const courseB = await prisma.course.create({
    data: { name: "Curso B", grade: "5°", year: 2026 },
  });
  await prisma.userCourse.create({ data: { userId: user.id, courseId: courseA.id } });
  return { user, courseA, courseB };
}

function sessionUser(user: { id: string; name: string; email: string }) {
  return { id: user.id, role: "THERAPIST" as const };
}

async function createStudent(documentId: string, courseId: string) {
  return prisma.student.create({
    data: {
      documentId,
      firstName: "Estudiante",
      lastName: documentId,
      sex: "F",
      grade: "3°",
      courseId,
    },
  });
}

async function createAttendance(params: {
  studentId: string;
  therapyId: string;
  professionalId: string;
  date: string;
  startTime: string;
  endTime: string;
}) {
  return prisma.attendance.create({
    data: {
      ...params,
      durationMinutes: 45,
      professionalName: "Terapeuta Prueba",
      createdById: params.professionalId,
    },
  });
}

beforeEach(reset);
afterAll(async () => {
  await prisma.$disconnect();
});

describe("alcance por curso", () => {
  it("limita a terapeutas y docentes a sus cursos asignados", async () => {
    const { user, courseA } = await baseFixtures();
    const scope = await getCourseScope(sessionUser(user));
    expect(scope).toEqual([courseA.id]);
  });

  it("no limita a administración ni coordinación", async () => {
    const { user } = await baseFixtures();
    const adminScope = await getCourseScope({ ...sessionUser(user), role: "ADMIN" });
    const coordinatorScope = await getCourseScope({ ...sessionUser(user), role: "COORDINATOR" });
    expect(adminScope).toBeNull();
    expect(coordinatorScope).toBeNull();
  });
});

describe("relación de atención F24", () => {
  it("agrega sesiones y última fecha por estudiante y terapia", async () => {
    const { user, courseA, courseB } = await baseFixtures();
    const therapy = await prisma.therapy.create({
      data: { key: "fono", nameEs: "Fonoaudiología", kind: "THERAPY", sortOrder: 1 },
    });
    const studentA = await createStudent("2001", courseA.id);
    const studentB = await createStudent("2002", courseB.id);
    await prisma.studentTherapy.create({
      data: { studentId: studentA.id, therapyId: therapy.id, therapistId: user.id, startDate: "2026-09-01" },
    });
    await createAttendance({
      studentId: studentA.id,
      therapyId: therapy.id,
      professionalId: user.id,
      date: "2026-09-05",
      startTime: "08:00",
      endTime: "08:45",
    });
    await createAttendance({
      studentId: studentA.id,
      therapyId: therapy.id,
      professionalId: user.id,
      date: "2026-09-20",
      startTime: "09:00",
      endTime: "09:45",
    });
    await createAttendance({
      studentId: studentB.id,
      therapyId: therapy.id,
      professionalId: user.id,
      date: "2026-09-10",
      startTime: "10:00",
      endTime: "10:45",
    });

    const summary = await getAttentionSummary({ scope: null, from: "2026-09-01", to: "2026-09-30" });
    expect(summary.rows).toHaveLength(2);
    const rowA = summary.rows.find((row) => row.student.id === studentA.id);
    const rowB = summary.rows.find((row) => row.student.id === studentB.id);
    expect(rowA?.cells[0]).toMatchObject({ assigned: true, sessions: 2, lastDate: "2026-09-20" });
    expect(rowB?.cells[0]).toMatchObject({ assigned: false, sessions: 1, lastDate: "2026-09-10" });

    const filtered = await getAttentionSummary({
      scope: null,
      courseId: courseA.id,
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(filtered.rows.map((row) => row.student.documentId)).toEqual(["2001"]);

    const scoped = await getAttentionSummary({
      scope: [courseB.id],
      from: "2026-09-01",
      to: "2026-09-30",
    });
    expect(scoped.rows.map((row) => row.student.documentId)).toEqual(["2002"]);
  });
});

describe("invariantes de asistencia y observaciones", () => {
  it("impide duplicar una sesión con el mismo estudiante, fecha, terapia y hora", async () => {
    const { user, courseA } = await baseFixtures();
    const therapy = await prisma.therapy.create({
      data: { key: "psico", nameEs: "Psicología", kind: "THERAPY", sortOrder: 2 },
    });
    const student = await createStudent("3001", courseA.id);
    const payload = {
      studentId: student.id,
      therapyId: therapy.id,
      professionalId: user.id,
      date: "2026-10-05",
      startTime: "08:00",
      endTime: "08:45",
    };
    await createAttendance(payload);
    await expect(createAttendance(payload)).rejects.toThrow();
    expect(await prisma.attendance.count()).toBe(1);
  });

  it("guarda una observación con sus cinco niveles en una transacción", async () => {
    const { user, courseA } = await baseFixtures();
    const student = await createStudent("4001", courseA.id);
    const domain = await prisma.domain.create({
      data: { key: "oral", nameEs: "Comunicación", nameEn: "Communication", sortOrder: 1 },
    });
    const cycle = await prisma.observationCycle.create({
      data: {
        courseId: courseA.id,
        year: 2026,
        period: 1,
        dateFrom: "2026-02-01",
        dateTo: "2026-03-31",
        createdById: user.id,
      },
    });

    await prisma.$transaction(async (tx) => {
      const observation = await tx.observation.create({
        data: {
          cycleId: cycle.id,
          studentId: student.id,
          observationDate: "2026-03-10",
          parentMeetingDate: "2026-03-12",
          parentAttended: true,
          updatedById: user.id,
          scores: { create: [{ domainId: domain.id, level: 3, note: "Avance estable" }] },
        },
      });
      expect(observation.id).toBeTruthy();
    });

    const saved = await prisma.observation.findUnique({
      where: { cycleId_studentId: { cycleId: cycle.id, studentId: student.id } },
      include: { scores: true },
    });
    expect(saved?.scores).toHaveLength(1);
    expect(saved?.scores[0].level).toBe(3);

    await expect(
      prisma.observationCycle.create({
        data: {
          courseId: courseA.id,
          year: 2026,
          period: 1,
          dateFrom: "2026-02-01",
          dateTo: "2026-03-31",
          createdById: user.id,
        },
      }),
    ).rejects.toThrow();
  });
});
