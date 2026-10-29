import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Admin123!";
const DEMO_SIGNATURE = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAUAAAABaCAYAAADJqo/jAAADgUlEQVR42u3d603kMBQG0AyiAAqiGSrbZiiIDsKvkWA1QF72/ZycI620K6GdjBN/uX4k3OZ5ngCu6EkTAAIQQAACCEAAAQggAAEEIIAABBCAAAIQQAACCEAAAQggAAEEIIAABBCAAAIQQAACCEAAAQggAAEEIIAABBCAAAIQQAACfPesCbZ7eX2b73//eP930yKgArxc+D36NyAAAQTgmas/VSAIQITg6c7l/Y/WEIA8CLhHix8pHUYHNseLAGxe3SWGoA4MArBp+H0NvuRKEHO8PHabZ+d0b/ht/dmKOcik/YqJ+yiXhJw9n+fZJ6sC3OC3k1lZCS75nKT5ybTjWnrzUgmeZwrmySrc/kWPhE7zU+dVrSy/zn46j6khmLrINdINInYIXD2UPOIYenyHpQszW4L8CsP0vQtbVe2YdCwjTyEYAje8wFpXDms6b8pdOmmYvrZqNhxeX0Xv/dlLVoDVFcLRd9cWd+st/2fiAs398/eEee9zUtmOaRXWb8eTXkVHBuDSO0PLRmsxXDzqxO8NiqoLcMnn9grBI9qgoh3XVk1Vx7N1BFIRhFEBuLZCaNFgLefKWswpjtB5135eyyA88rv3bMc9K9RV884jzGXGBGBChVB18VTcMatuKHvnKNOnIlLCpte0S+WUzmkCcO9G49FOQML37fGdk4aaLb9rqxA84tynTL2kBmF5ACZURCnzORVzYj0775HnJ2neM2WRa5RKPKlPlgZg6pxY5Ype7znPFt+/5/Crai5x1ErriKddUnYODB2AqauiCZutq1e9k6vprRu/R2jH6sBO3sDc6rnikgC0Ly7vyYiRtob8FRRp+/SSt4WM9uTGy+vbPHQA9pyMHmlD5uiP/iXvi0tux6o5ttTjmM78KFzrTrL0Ikt9jnIKfMvN1kfXerTn1hdTpLRjeuhcoU90qwCTNt8mvRgg8f1pI73/MPmmlrLI5fdcFweg+Y3plC+D8HaUcYfpdBoCV16YLqp2bZcWOP9/9kjDSNfpSStAFcI5fwuetnT9qQCdcB3ZeUUAjtFJUodIow+FtaPrzxD44nuJVH5w8QpQ+AGGwMLPEA4G8awJcENDBahCACaLIAAqQAABCCAAAQQggAAEEIAAAhBAAAIIQAABCCAAAQQggAAEEIAAAhBAAAIIQAABCCAAAQQggAAEEIAAAhBAAAIIQAABCFzaJ3sfxwpqKzfuAAAAAElFTkSuQmCC",
  "base64",
);

const USERS = [
  { email: "admin@fatr.local", name: "Administración General", role: "ADMIN" },
  { email: "coordinacion@fatr.local", name: "Paula Sánchez", role: "COORDINATOR" },
  { email: "terapeuta1@fatr.local", name: "Laura Gómez", role: "THERAPIST" },
  { email: "terapeuta2@fatr.local", name: "Carlos Rojas", role: "THERAPIST" },
  { email: "docente1@fatr.local", name: "Marta Pérez", role: "TEACHER" },
  { email: "docente2@fatr.local", name: "Jorge Ramírez", role: "TEACHER" },
];

const COURSES = [
  { key: "course1", name: "Transición A", grade: "Transición", year: 2026 },
  { key: "course2", name: "Primaria 3° A", grade: "3°", year: 2026 },
  { key: "course3", name: "Primaria 5° A", grade: "5°", year: 2026 },
];

const DOMAINS = [
  {
    key: "oral_written",
    nameEs:
      "Comunicación oral y escrita (vocabulario y uso del lenguaje, pronunciación)",
    nameEn:
      "Oral and written communication (vocabulary and language use, speech, phonological and phonemic awareness)",
    sortOrder: 1,
  },
  {
    key: "school_work",
    nameEs: "Trabajo en clase (calidad y manejo del tiempo)",
    nameEn: "School work (quality and time management)",
    sortOrder: 2,
  },
  {
    key: "fine_motor",
    nameEs: "Habilidades motoras finas",
    nameEn: "Fine motor skills",
    sortOrder: 3,
  },
  {
    key: "self_regulation",
    nameEs: "Autorregulación y control",
    nameEn: "Self-regulation and control",
    sortOrder: 4,
  },
  {
    key: "social_intelligence",
    nameEs: "Inteligencia social (habilidades interpersonales)",
    nameEn: "Social intelligence (interpersonal skills)",
    sortOrder: 5,
  },
];

const THERAPIES = [
  { key: "fonoaudiologia", nameEs: "Fonoaudiología", kind: "THERAPY", sortOrder: 1 },
  { key: "psicologia", nameEs: "Psicología", kind: "THERAPY", sortOrder: 2 },
  { key: "ocupacional", nameEs: "Terapia Ocupacional", kind: "THERAPY", sortOrder: 3 },
  { key: "conducta", nameEs: "Moldeamiento de conducta", kind: "THERAPY", sortOrder: 4 },
  { key: "refuerzo", nameEs: "Refuerzo académico", kind: "SUPPORT_AREA", sortOrder: 5 },
];

type StudentSpec = {
  key: string;
  course: string;
  documentId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  sex: string;
  grade: string;
  guardianName: string;
  guardianPhone: string;
  guardianEmail: string;
  diagnosis?: string;
};

const STUDENTS: StudentSpec[] = [
  {
    key: "sofia",
    course: "course1",
    documentId: "1001",
    firstName: "Sofía",
    lastName: "Martínez",
    birthDate: "2021-03-12",
    sex: "F",
    grade: "Transición",
    guardianName: "Ana Martínez",
    guardianPhone: "300 111 2233",
    guardianEmail: "ana.martinez@example.com",
    diagnosis: "Trastorno del lenguaje expresivo",
  },
  {
    key: "mateo",
    course: "course1",
    documentId: "1002",
    firstName: "Mateo",
    lastName: "García",
    birthDate: "2020-11-05",
    sex: "M",
    grade: "Transición",
    guardianName: "Diego García",
    guardianPhone: "300 222 3344",
    guardianEmail: "diego.garcia@example.com",
    diagnosis: "Dificultades de autorregulación emocional",
  },
  {
    key: "isabella",
    course: "course1",
    documentId: "1003",
    firstName: "Isabella",
    lastName: "Rodríguez",
    birthDate: "2021-01-20",
    sex: "F",
    grade: "Transición",
    guardianName: "Carolina Rodríguez",
    guardianPhone: "300 333 4455",
    guardianEmail: "carolina.rodriguez@example.com",
  },
  {
    key: "samuel",
    course: "course1",
    documentId: "1004",
    firstName: "Samuel",
    lastName: "López",
    birthDate: "2020-08-30",
    sex: "M",
    grade: "Transición",
    guardianName: "Andrés López",
    guardianPhone: "300 444 5566",
    guardianEmail: "andres.lopez@example.com",
  },
  {
    key: "valeria",
    course: "course2",
    documentId: "2001",
    firstName: "Valeria",
    lastName: "Torres",
    birthDate: "2018-06-14",
    sex: "F",
    grade: "3°",
    guardianName: "Marcela Torres",
    guardianPhone: "310 111 2233",
    guardianEmail: "marcela.torres@example.com",
    diagnosis: "Trastorno por déficit de atención",
  },
  {
    key: "nicolas",
    course: "course2",
    documentId: "2002",
    firstName: "Nicolás",
    lastName: "Díaz",
    birthDate: "2018-09-22",
    sex: "M",
    grade: "3°",
    guardianName: "Felipe Díaz",
    guardianPhone: "310 222 3344",
    guardianEmail: "felipe.diaz@example.com",
  },
  {
    key: "camila",
    course: "course2",
    documentId: "2003",
    firstName: "Camila",
    lastName: "Herrera",
    birthDate: "2018-02-08",
    sex: "F",
    grade: "3°",
    guardianName: "Liliana Herrera",
    guardianPhone: "310 333 4455",
    guardianEmail: "liliana.herrera@example.com",
  },
  {
    key: "andres",
    course: "course2",
    documentId: "2004",
    firstName: "Andrés",
    lastName: "Morales",
    birthDate: "2018-12-01",
    sex: "M",
    grade: "3°",
    guardianName: "Patricia Morales",
    guardianPhone: "310 444 5566",
    guardianEmail: "patricia.morales@example.com",
  },
  {
    key: "mariana",
    course: "course3",
    documentId: "3001",
    firstName: "Mariana",
    lastName: "Castro",
    birthDate: "2016-04-18",
    sex: "F",
    grade: "5°",
    guardianName: "Sandra Castro",
    guardianPhone: "320 111 2233",
    guardianEmail: "sandra.castro@example.com",
    diagnosis: "Dislexia",
  },
  {
    key: "santiago",
    course: "course3",
    documentId: "3002",
    firstName: "Santiago",
    lastName: "Jiménez",
    birthDate: "2016-07-09",
    sex: "M",
    grade: "5°",
    guardianName: "Óscar Jiménez",
    guardianPhone: "320 222 3344",
    guardianEmail: "oscar.jimenez@example.com",
  },
  {
    key: "luna",
    course: "course3",
    documentId: "3003",
    firstName: "Luna",
    lastName: "Vargas",
    birthDate: "2016-10-25",
    sex: "F",
    grade: "5°",
    guardianName: "Claudia Vargas",
    guardianPhone: "320 333 4455",
    guardianEmail: "claudia.vargas@example.com",
  },
  {
    key: "sebastian",
    course: "course3",
    documentId: "3004",
    firstName: "Sebastián",
    lastName: "Ortiz",
    birthDate: "2016-01-30",
    sex: "M",
    grade: "5°",
    guardianName: "Julián Ortiz",
    guardianPhone: "320 444 5566",
    guardianEmail: "julian.ortiz@example.com",
  },
];

const ASSIGNMENTS: Array<[string, string, string | null, string]> = [
  ["sofia", "fonoaudiologia", "terapeuta1@fatr.local", "2026-08-03"],
  ["sofia", "ocupacional", "terapeuta1@fatr.local", "2026-08-03"],
  ["mateo", "psicologia", "terapeuta1@fatr.local", "2026-08-03"],
  ["mateo", "conducta", "terapeuta1@fatr.local", "2026-08-10"],
  ["isabella", "fonoaudiologia", "terapeuta1@fatr.local", "2026-08-03"],
  ["samuel", "refuerzo", null, "2026-08-17"],
  ["valeria", "ocupacional", "terapeuta1@fatr.local", "2026-08-03"],
  ["valeria", "psicologia", "terapeuta1@fatr.local", "2026-08-03"],
  ["nicolas", "fonoaudiologia", "terapeuta1@fatr.local", "2026-08-10"],
  ["camila", "conducta", "terapeuta1@fatr.local", "2026-08-10"],
  ["andres", "refuerzo", null, "2026-08-17"],
  ["mariana", "fonoaudiologia", "terapeuta2@fatr.local", "2026-08-03"],
  ["mariana", "ocupacional", "terapeuta2@fatr.local", "2026-08-03"],
  ["santiago", "psicologia", "terapeuta2@fatr.local", "2026-08-10"],
  ["luna", "conducta", "terapeuta2@fatr.local", "2026-08-10"],
  ["sebastian", "refuerzo", null, "2026-08-17"],
];

const CYCLES = [
  {
    key: "cycle1",
    course: "course1",
    year: 2026,
    period: 1,
    label: "Periodo 1",
    dateFrom: "2026-08-03",
    dateTo: "2026-10-30",
    status: "DRAFT",
  },
  {
    key: "cycle2",
    course: "course2",
    year: 2026,
    period: 1,
    label: "Periodo 1",
    dateFrom: "2026-08-03",
    dateTo: "2026-10-30",
    status: "DRAFT",
  },
  {
    key: "cycle3",
    course: "course3",
    year: 2026,
    period: 1,
    label: "Periodo 1",
    dateFrom: "2026-08-03",
    dateTo: "2026-10-30",
    status: "FINAL",
  },
];

const ATTENDANCE: Array<{
  key: string;
  student: string;
  therapy: string;
  date: string;
  start: string;
  end: string;
  minutes: number;
  professional: string;
  guardian: boolean;
}> = [
  { key: "a1", student: "sofia", therapy: "fonoaudiologia", date: "2026-10-06", start: "08:00", end: "08:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a2", student: "sofia", therapy: "fonoaudiologia", date: "2026-10-13", start: "08:00", end: "08:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a3", student: "sofia", therapy: "fonoaudiologia", date: "2026-10-20", start: "08:00", end: "08:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a4", student: "sofia", therapy: "fonoaudiologia", date: "2026-10-27", start: "08:00", end: "08:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a5", student: "mateo", therapy: "psicologia", date: "2026-10-07", start: "09:00", end: "09:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a6", student: "mateo", therapy: "psicologia", date: "2026-10-14", start: "09:00", end: "09:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a7", student: "mateo", therapy: "psicologia", date: "2026-10-21", start: "09:00", end: "09:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a8", student: "mateo", therapy: "psicologia", date: "2026-10-28", start: "09:00", end: "09:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a9", student: "isabella", therapy: "fonoaudiologia", date: "2026-10-08", start: "10:00", end: "10:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: false },
  { key: "a10", student: "isabella", therapy: "fonoaudiologia", date: "2026-10-15", start: "10:00", end: "10:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a11", student: "isabella", therapy: "fonoaudiologia", date: "2026-10-22", start: "10:00", end: "10:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a12", student: "isabella", therapy: "fonoaudiologia", date: "2026-10-29", start: "10:00", end: "10:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a13", student: "valeria", therapy: "ocupacional", date: "2026-10-06", start: "11:00", end: "11:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a14", student: "valeria", therapy: "ocupacional", date: "2026-10-13", start: "11:00", end: "11:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a15", student: "valeria", therapy: "ocupacional", date: "2026-10-20", start: "11:00", end: "11:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a16", student: "valeria", therapy: "ocupacional", date: "2026-10-27", start: "11:00", end: "11:45", minutes: 45, professional: "terapeuta1@fatr.local", guardian: true },
  { key: "a17", student: "mariana", therapy: "fonoaudiologia", date: "2026-10-02", start: "08:00", end: "08:45", minutes: 45, professional: "terapeuta2@fatr.local", guardian: true },
  { key: "a18", student: "mariana", therapy: "fonoaudiologia", date: "2026-10-09", start: "08:00", end: "08:45", minutes: 45, professional: "terapeuta2@fatr.local", guardian: true },
  { key: "a19", student: "mariana", therapy: "fonoaudiologia", date: "2026-10-16", start: "08:00", end: "08:45", minutes: 45, professional: "terapeuta2@fatr.local", guardian: true },
  { key: "a20", student: "mariana", therapy: "fonoaudiologia", date: "2026-10-23", start: "08:00", end: "08:45", minutes: 45, professional: "terapeuta2@fatr.local", guardian: true },
];

const SETTINGS: Array<[string, string]> = [
  ["institution.name", "LEARNING CENTER"],
  ["institution.logo", ""],
  ["school.year", "2026"],
  ["forms.f22.code", "PM-04-F22"],
  ["forms.f22.version", "1"],
  ["forms.f22.validity", "17/09/21"],
  ["forms.f22.rowsPerPage", "20"],
  ["forms.f23.code", "PM-04-F23"],
  ["forms.f23.version", "1"],
  ["forms.f23.validity", "17/09/21"],
  ["forms.f24.code", "PM-04-F24"],
  ["forms.f24.version", "1"],
  ["forms.f24.validity", "17/09/21"],
  ["forms.f24.rowsPerPage", "8"],
  ["forms.f25.code", "PM-04-F25"],
  ["forms.f25.version", "1"],
  ["forms.f25.validity", "17/09/21"],
  ["forms.f25.rowsPerPage", "12"],
  ["attendance.requireSignature", "false"],
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const userIds: Record<string, string> = {};
  for (const user of USERS) {
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        role: user.role,
        active: true,
        passwordHash,
      },
      create: {
        email: user.email,
        name: user.name,
        role: user.role,
        passwordHash,
      },
    });
    userIds[user.email] = record.id;
  }

  const courseIds: Record<string, string> = {};
  for (const course of COURSES) {
    const record = await prisma.course.upsert({
      where: { name_year: { name: course.name, year: course.year } },
      update: { grade: course.grade, active: true },
      create: {
        name: course.name,
        grade: course.grade,
        year: course.year,
      },
    });
    courseIds[course.key] = record.id;
  }

  const links: Array<[string, string]> = [
    ["docente1@fatr.local", "course1"],
    ["docente1@fatr.local", "course2"],
    ["docente2@fatr.local", "course3"],
    ["terapeuta1@fatr.local", "course1"],
    ["terapeuta1@fatr.local", "course2"],
    ["terapeuta2@fatr.local", "course3"],
  ];
  for (const [email, courseKey] of links) {
    await prisma.userCourse.upsert({
      where: {
        userId_courseId: {
          userId: userIds[email],
          courseId: courseIds[courseKey],
        },
      },
      update: {},
      create: {
        userId: userIds[email],
        courseId: courseIds[courseKey],
      },
    });
  }

  const domainIds: Record<string, string> = {};
  for (const domain of DOMAINS) {
    const record = await prisma.domain.upsert({
      where: { key: domain.key },
      update: {
        nameEs: domain.nameEs,
        nameEn: domain.nameEn,
        sortOrder: domain.sortOrder,
        active: true,
      },
      create: {
        key: domain.key,
        nameEs: domain.nameEs,
        nameEn: domain.nameEn,
        sortOrder: domain.sortOrder,
      },
    });
    domainIds[domain.key] = record.id;
  }

  const therapyIds: Record<string, string> = {};
  for (const therapy of THERAPIES) {
    const record = await prisma.therapy.upsert({
      where: { key: therapy.key },
      update: {
        nameEs: therapy.nameEs,
        kind: therapy.kind,
        sortOrder: therapy.sortOrder,
        active: true,
      },
      create: {
        key: therapy.key,
        nameEs: therapy.nameEs,
        kind: therapy.kind,
        sortOrder: therapy.sortOrder,
      },
    });
    therapyIds[therapy.key] = record.id;
  }

  const studentIds: Record<string, string> = {};
  for (const student of STUDENTS) {
    const payload = {
      firstName: student.firstName,
      lastName: student.lastName,
      birthDate: student.birthDate,
      sex: student.sex,
      grade: student.grade,
      guardianName: student.guardianName,
      guardianPhone: student.guardianPhone,
      guardianEmail: student.guardianEmail,
      diagnosis: student.diagnosis ?? null,
      diagnosisUpdatedAt: student.diagnosis ? new Date("2026-09-01") : null,
      active: true,
      courseId: courseIds[student.course],
    };
    const record = await prisma.student.upsert({
      where: { documentId: student.documentId },
      update: payload,
      create: { documentId: student.documentId, ...payload },
    });
    studentIds[student.key] = record.id;
  }

  for (const [studentKey, therapyKey, therapistEmail, startDate] of ASSIGNMENTS) {
    const therapistId = therapistEmail ? userIds[therapistEmail] : null;
    await prisma.studentTherapy.upsert({
      where: {
        studentId_therapyId: {
          studentId: studentIds[studentKey],
          therapyId: therapyIds[therapyKey],
        },
      },
      update: { therapistId, startDate, active: true },
      create: {
        studentId: studentIds[studentKey],
        therapyId: therapyIds[therapyKey],
        therapistId,
        startDate,
      },
    });
  }

  const cycleIds: Record<string, string> = {};
  for (const cycle of CYCLES) {
    const record = await prisma.observationCycle.upsert({
      where: {
        courseId_year_period: {
          courseId: courseIds[cycle.course],
          year: cycle.year,
          period: cycle.period,
        },
      },
      update: {
        label: cycle.label,
        dateFrom: cycle.dateFrom,
        dateTo: cycle.dateTo,
        status: cycle.status,
      },
      create: {
        courseId: courseIds[cycle.course],
        year: cycle.year,
        period: cycle.period,
        label: cycle.label,
        dateFrom: cycle.dateFrom,
        dateTo: cycle.dateTo,
        status: cycle.status,
        createdById: userIds["coordinacion@fatr.local"],
      },
    });
    cycleIds[cycle.key] = record.id;
  }

  const levels = [3, 2, 3, 4, 3];
  const notes = [
    "Se expresa con apoyo visual.",
    "Requiere acompañamiento para organizar el tiempo.",
    "",
    "Participa activamente en las actividades.",
    "Interactúa con sus compañeros.",
  ];

  for (const cycle of CYCLES) {
    const courseStudents = STUDENTS.filter((s) => s.course === cycle.course);
    for (const student of courseStudents) {
      const observation = await prisma.observation.upsert({
        where: {
          cycleId_studentId: {
            cycleId: cycleIds[cycle.key],
            studentId: studentIds[student.key],
          },
        },
        update: {
          observationDate: "2026-10-15",
          parentMeetingDate:
            student.key === "sofia" || student.key === "valeria"
              ? "2026-11-05"
              : null,
          parentAttended: student.key === "sofia" ? false : null,
          studentMeetingDate: "2026-10-22",
          diagnosisNote:
            student.key === "sofia" ? "Remisión a apoyo pedagógico" : null,
          nextFollowUpDate: "2026-11-20",
        },
        create: {
          cycleId: cycleIds[cycle.key],
          studentId: studentIds[student.key],
          observationDate: "2026-10-15",
          parentMeetingDate:
            student.key === "sofia" || student.key === "valeria"
              ? "2026-11-05"
              : null,
          parentAttended: student.key === "sofia" ? false : null,
          studentMeetingDate: "2026-10-22",
          diagnosisNote:
            student.key === "sofia" ? "Remisión a apoyo pedagógico" : null,
          nextFollowUpDate: "2026-11-20",
          updatedById: userIds["coordinacion@fatr.local"],
        },
      });

      const orderedDomains = DOMAINS.slice().sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      for (let i = 0; i < orderedDomains.length; i += 1) {
        const domain = orderedDomains[i];
        await prisma.observationScore.upsert({
          where: {
            observationId_domainId: {
              observationId: observation.id,
              domainId: domainIds[domain.key],
            },
          },
          update: { level: levels[i], note: notes[i] || null },
          create: {
            observationId: observation.id,
            domainId: domainIds[domain.key],
            level: levels[i],
            note: notes[i] || null,
          },
        });
      }
    }
  }

  const followUps = [
    {
      id: "seed-followup-sofia",
      student: "sofia",
      cycleLabel: "2026-1",
      startDate: "2026-08-03",
      followUpDate: "2026-10-15",
      realizationDate: "2026-10-20",
      descriptionInitial:
        "Al inicio del proceso, Sofía presentaba dificultades para estructurar frases completas y sostener la atención durante las actividades de lenguaje. Su vocabulario era limitado para su edad y evitaba participar en conversaciones grupales.",
      strategies:
        "Se implementaron actividades lúdicas de conciencia fonológica, lectura compartida con apoyo visual, modelado del lenguaje y refuerzo positivo. Se articuló el trabajo con la docente del aula para generalizar los aprendizajes.",
      achievements:
        "Sofía aumenta progresivamente la longitud de sus frases, utiliza nuevo vocabulario en contextos cotidianos y participa con mayor seguridad en las actividades grupales. Se observa mayor tiempo de atención sostenida.",
      followUpNotes:
        "Continuar con el plan de estimulación del lenguaje, mantener reuniones mensuales con la familia y realizar seguimiento conjunto con el aula. Próxima revisión en noviembre de 2026.",
      responsibleName: "Laura Gómez",
      workArea: "Fonoaudiología",
      counselorName: "Paula Sánchez",
      status: "DRAFT",
    },
    {
      id: "seed-followup-valeria",
      student: "valeria",
      cycleLabel: "2026-1",
      startDate: "2026-08-10",
      followUpDate: "2026-10-10",
      realizationDate: "2026-10-18",
      descriptionInitial:
        "Valeria mostraba dificultades para organizar sus materiales, seguir instrucciones de varios pasos y regular la frustración ante tareas extensas. Se distraía con facilidad durante el trabajo independiente.",
      strategies:
        "Se utilizaron agendas visuales, temporizadores, división de tareas en pasos cortos, pausas activas y refuerzo positivo. Se trabajó en habilidades de planificación y autorregulación emocional.",
      achievements:
        "Valeria logra completar tareas cortas de manera autónoma, utiliza la agenda visual y solicita apoyo de forma más adecuada. Se evidencia una disminución de las conductas de frustración.",
      followUpNotes:
        "Mantener las rutinas visuales en casa y en el aula. Revisar el plan de atención conjunta en la próxima reunión de seguimiento.",
      responsibleName: "Laura Gómez",
      workArea: "Terapia Ocupacional",
      counselorName: "Paula Sánchez",
      status: "FINAL",
    },
    {
      id: "seed-followup-mariana",
      student: "mariana",
      cycleLabel: "2026-1",
      startDate: "2026-09-01",
      followUpDate: "2026-11-01",
      realizationDate: "2026-10-25",
      descriptionInitial:
        "Mariana presentaba dificultades en la lectura de palabras poco frecuentes, omisiones de letras y baja comprensión lectora. Mostraba inseguridad al leer en voz alta frente al grupo.",
      strategies:
        "Se implementaron ejercicios de conciencia fonológica, lectura asistida, uso de textos de interés, apoyos visuales y estrategias de comprensión antes, durante y después de la lectura.",
      achievements:
        "Mariana mejora la precisión lectora, reconoce con mayor facilidad palabras de uso frecuente y participa en lecturas guiadas con apoyo. Se recomienda continuar fortaleciendo la fluidez.",
      followUpNotes:
        "Continuar con lectura diaria de 15 minutos, revisar avances en diciembre y articular con la docente de lenguaje.",
      responsibleName: "Carlos Rojas",
      workArea: "Fonoaudiología",
      counselorName: "Paula Sánchez",
      status: "DRAFT",
    },
  ];

  for (const followUp of followUps) {
    const student = STUDENTS.find((s) => s.key === followUp.student);
    const payload = {
      studentId: studentIds[followUp.student],
      cycleLabel: followUp.cycleLabel,
      startDate: followUp.startDate,
      followUpDate: followUp.followUpDate,
      realizationDate: followUp.realizationDate,
      diagnosisSnapshot: student?.diagnosis ?? null,
      descriptionInitial: followUp.descriptionInitial,
      strategies: followUp.strategies,
      achievements: followUp.achievements,
      followUpNotes: followUp.followUpNotes,
      responsibleId: userIds[
        followUp.responsibleName === "Laura Gómez"
          ? "terapeuta1@fatr.local"
          : "terapeuta2@fatr.local"
      ],
      responsibleName: followUp.responsibleName,
      workArea: followUp.workArea,
      counselorName: followUp.counselorName,
      status: followUp.status,
      createdById: userIds[
        followUp.responsibleName === "Laura Gómez"
          ? "terapeuta1@fatr.local"
          : "terapeuta2@fatr.local"
      ],
    };
    await prisma.followUp.upsert({
      where: { id: followUp.id },
      update: payload,
      create: { id: followUp.id, ...payload },
    });
  }

  for (const row of ATTENDANCE) {
    const student = STUDENTS.find((s) => s.key === row.student);
    const professionalId = userIds[row.professional];
    const professionalName = USERS.find(
      (u) => u.email === row.professional,
    )?.name;
    const attendanceId = `seed-${row.key}`;
    const payload = {
      studentId: studentIds[row.student],
      therapyId: therapyIds[row.therapy],
      date: row.date,
      durationMinutes: row.minutes,
      startTime: row.start,
      endTime: row.end,
      professionalId,
      professionalName: professionalName ?? "Profesional",
      notes: null,
      createdById: professionalId,
    };
    await prisma.attendance.upsert({
      where: { id: attendanceId },
      update: payload,
      create: { id: attendanceId, ...payload },
    });

    const professionalSignature = {
      attendanceId,
      role: "PROFESSIONAL",
      data: DEMO_SIGNATURE,
      mimeType: "image/png",
      signerName: professionalName ?? "Profesional",
    };
    await prisma.signature.upsert({
      where: {
        attendanceId_role: { attendanceId, role: "PROFESSIONAL" },
      },
      update: professionalSignature,
      create: professionalSignature,
    });

    if (row.guardian) {
      const guardianSignature = {
        attendanceId,
        role: "GUARDIAN",
        data: DEMO_SIGNATURE,
        mimeType: "image/png",
        signerName: student?.guardianName ?? "Acudiente",
      };
      await prisma.signature.upsert({
        where: {
          attendanceId_role: { attendanceId, role: "GUARDIAN" },
        },
        update: guardianSignature,
        create: guardianSignature,
      });
    }
  }

  for (const [key, value] of SETTINGS) {
    await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
  }

  const counts = {
    usuarios: await prisma.user.count(),
    cursos: await prisma.course.count(),
    estudiantes: await prisma.student.count(),
    dominios: await prisma.domain.count(),
    terapias: await prisma.therapy.count(),
    ciclos: await prisma.observationCycle.count(),
    observaciones: await prisma.observation.count(),
    seguimientos: await prisma.followUp.count(),
    asistencias: await prisma.attendance.count(),
    firmas: await prisma.signature.count(),
  };
  console.log("Seed completado:", counts);
  console.log(`Credenciales demo: admin@fatr.local / ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
