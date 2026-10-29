import "server-only";
import { prisma } from "@/lib/db";
import type { SessionUser } from "@/lib/dal";
import { studentScopeWhere } from "@/lib/scope";
import { addDaysIso, startOfWeekIso, subtractDaysIso, todayIso } from "@/lib/dates";

export type TrendPoint = { weekStart: string; label: string; count: number };

export type DashboardData = {
  activeStudents: number;
  totalCourses: number;
  sessions30: number;
  sessionsPrev30: number;
  trend: TrendPoint[];
  therapySessions: { key: string; name: string; count: number }[];
  observationProgress: {
    cycleId: string;
    label: string;
    courseName: string;
    completed: number;
    expected: number;
    percent: number;
  }[];
  followUps: { draft: number; closed: number; upcoming: number; overdue: number };
  parentMeetings: {
    id: string;
    studentName: string;
    courseName: string;
    date: string;
    attended: boolean | null;
  }[];
  withoutAttendance: { id: string; name: string; courseName: string; lastDate: string | null }[];
};

export async function getDashboardData(user: SessionUser, scope: string[] | null): Promise<DashboardData> {
  const today = todayIso();
  const from30 = subtractDaysIso(today, 30);
  const from60 = subtractDaysIso(today, 60);
  const trendFrom = subtractDaysIso(today, 55);
  const studentWhere = { active: true, ...studentScopeWhere(scope) };

  const [
    activeStudents,
    totalCourses,
    sessions30,
    sessionsPrev30,
    trendRows,
    therapyGroups,
    therapies,
    cycles,
    draftFollowUps,
    closedFollowUps,
    upcomingFollowUps,
    overdueFollowUps,
    parentMeetingRows,
    studentsForAttendance,
  ] = await Promise.all([
    prisma.student.count({ where: studentWhere }),
    prisma.course.count({ where: { active: true, ...(scope ? { id: { in: scope } } : {}) } }),
    prisma.attendance.count({ where: { date: { gte: from30, lte: today }, student: studentWhere } }),
    prisma.attendance.count({
      where: { date: { gte: from60, lt: from30 }, student: studentWhere },
    }),
    prisma.attendance.findMany({
      where: { date: { gte: trendFrom, lte: today }, student: studentWhere },
      select: { date: true },
    }),
    prisma.attendance.groupBy({
      by: ["therapyId"],
      where: { date: { gte: from30, lte: today }, student: studentWhere },
      _count: { _all: true },
    }),
    prisma.therapy.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.observationCycle.findMany({
      where: scope ? { courseId: { in: scope } } : {},
      orderBy: [{ year: "desc" }, { period: "desc" }],
      take: 6,
      include: { course: { select: { name: true } } },
    }),
    prisma.followUp.count({ where: { status: "DRAFT", student: studentWhere } }),
    prisma.followUp.count({ where: { status: "FINAL", student: studentWhere } }),
    prisma.followUp.count({
      where: { status: "DRAFT", followUpDate: { gte: today }, student: studentWhere },
    }),
    prisma.followUp.count({
      where: { status: "DRAFT", followUpDate: { lt: today }, student: studentWhere },
    }),
    prisma.observation.findMany({
      where: {
        parentMeetingDate: { gte: today },
        student: studentWhere,
      },
      orderBy: { parentMeetingDate: "asc" },
      take: 6,
      select: {
        id: true,
        parentMeetingDate: true,
        parentAttended: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            course: { select: { name: true } },
          },
        },
      },
    }),
    prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        course: { select: { name: true } },
        attendances: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
      },
    }),
  ]);

  const trendMap = new Map<string, number>();
  for (const row of trendRows) {
    const week = startOfWeekIso(row.date);
    trendMap.set(week, (trendMap.get(week) ?? 0) + 1);
  }
  const trend: TrendPoint[] = [];
  for (let i = 7; i >= 0; i -= 1) {
    const week = startOfWeekIso(subtractDaysIso(today, i * 7));
    trend.push({
      weekStart: week,
      label: `${week.slice(8, 10)}/${week.slice(5, 7)}`,
      count: trendMap.get(week) ?? 0,
    });
  }

  const therapyMap = new Map(therapyGroups.map((group) => [group.therapyId, group._count._all]));
  const therapySessions = therapies
    .map((therapy) => ({
      key: therapy.key,
      name: therapy.nameEs,
      count: therapyMap.get(therapy.id) ?? 0,
    }))
    .filter((item) => item.count > 0);

  const domainCount = await prisma.domain.count({ where: { active: true } });

  const observationProgress = await Promise.all(
    cycles.map(async (cycle) => {
      const [studentCount, scoredCount] = await Promise.all([
        prisma.student.count({ where: { courseId: cycle.courseId, active: true } }),
        prisma.observationScore.count({
          where: {
            observation: { cycleId: cycle.id },
            level: { not: null },
          },
        }),
      ]);
      const expected = Math.max(studentCount * domainCount, 1);
      const completed = Math.min(scoredCount, expected);
      return {
        cycleId: cycle.id,
        label: `${cycle.label ?? `Periodo ${cycle.period}`} · ${cycle.year}`,
        courseName: cycle.course.name,
        completed,
        expected,
        percent: Math.round((completed / expected) * 100),
      };
    }),
  );

  const withoutAttendance = studentsForAttendance
    .map((student) => ({
      id: student.id,
      name: `${student.firstName} ${student.lastName}`,
      courseName: student.course?.name ?? "Sin curso",
      lastDate: student.attendances[0]?.date ?? null,
    }))
    .filter((student) => !student.lastDate || student.lastDate < subtractDaysIso(today, 30))
    .sort((a, b) => (a.lastDate ?? "").localeCompare(b.lastDate ?? ""))
    .slice(0, 6);

  return {
    activeStudents,
    totalCourses,
    sessions30,
    sessionsPrev30,
    trend,
    therapySessions,
    observationProgress,
    followUps: {
      draft: draftFollowUps,
      closed: closedFollowUps,
      upcoming: upcomingFollowUps,
      overdue: overdueFollowUps,
    },
    parentMeetings: parentMeetingRows.map((row) => ({
      id: row.id,
      studentName: `${row.student.firstName} ${row.student.lastName}`,
      courseName: row.student.course?.name ?? "Sin curso",
      date: row.parentMeetingDate ?? addDaysIso(today, 0),
      attended: row.parentAttended,
    })),
    withoutAttendance,
  };
}

/** Resumen F24: asignaciones vs. sesiones realizadas por estudiante y terapia. */
export async function getAttentionSummary(params: {
  scope: string[] | null;
  courseId?: string;
  from: string;
  to: string;
}) {
  const studentWhere = {
    ...studentScopeWhere(params.scope),
    ...(params.courseId ? { courseId: params.courseId } : {}),
  };

  const [students, therapies, assignments, sessionGroups] = await Promise.all([
    prisma.student.findMany({
      where: { active: true, ...studentWhere },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        documentId: true,
        course: { select: { id: true, name: true } },
      },
    }),
    prisma.therapy.findMany({
      where: { kind: "THERAPY", active: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.studentTherapy.findMany({
      where: { active: true, student: { active: true, ...studentWhere } },
      select: { studentId: true, therapyId: true, therapist: { select: { name: true } } },
    }),
    prisma.attendance.groupBy({
      by: ["studentId", "therapyId"],
      where: {
        date: { gte: params.from, lte: params.to },
        student: { active: true, ...studentWhere },
      },
      _count: { _all: true },
      _max: { date: true },
    }),
  ]);

  const sessionMap = new Map(
    sessionGroups.map((group) => [
      `${group.studentId}:${group.therapyId}`,
      { count: group._count._all, lastDate: group._max.date },
    ]),
  );
  const assignmentMap = new Map(assignments.map((item) => [`${item.studentId}:${item.therapyId}`, item]));

  return {
    therapies,
    rows: students.map((student) => ({
      student,
      cells: therapies.map((therapy) => {
        const key = `${student.id}:${therapy.id}`;
        const assignment = assignmentMap.get(key);
        const sessions = sessionMap.get(key);
        return {
          therapyId: therapy.id,
          assigned: Boolean(assignment),
          therapistName: assignment?.therapist?.name ?? null,
          sessions: sessions?.count ?? 0,
          lastDate: sessions?.lastDate ?? null,
        };
      }),
    })),
  };
}
