-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserCourse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    CONSTRAINT "UserCourse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "documentId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "birthDate" TEXT,
    "sex" TEXT NOT NULL,
    "grade" TEXT NOT NULL,
    "guardianName" TEXT,
    "guardianPhone" TEXT,
    "guardianEmail" TEXT,
    "diagnosis" TEXT,
    "diagnosisUpdatedAt" DATETIME,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "courseId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Student_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Domain" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "ObservationCycle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "courseId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "period" INTEGER NOT NULL,
    "label" TEXT,
    "dateFrom" TEXT NOT NULL,
    "dateTo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ObservationCycle_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObservationCycle_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Observation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "cycleId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "observationDate" TEXT,
    "parentMeetingDate" TEXT,
    "parentAttended" BOOLEAN,
    "studentMeetingDate" TEXT,
    "diagnosisNote" TEXT,
    "nextFollowUpDate" TEXT,
    "updatedById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Observation_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES "ObservationCycle" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Observation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Observation_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ObservationScore" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "observationId" TEXT NOT NULL,
    "domainId" TEXT NOT NULL,
    "level" INTEGER,
    "note" TEXT,
    CONSTRAINT "ObservationScore_observationId_fkey" FOREIGN KEY ("observationId") REFERENCES "Observation" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ObservationScore_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "Domain" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "FollowUp" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "cycleLabel" TEXT,
    "startDate" TEXT NOT NULL,
    "followUpDate" TEXT NOT NULL,
    "realizationDate" TEXT NOT NULL,
    "diagnosisSnapshot" TEXT,
    "descriptionInitial" TEXT,
    "strategies" TEXT,
    "achievements" TEXT,
    "followUpNotes" TEXT,
    "responsibleId" TEXT,
    "responsibleName" TEXT NOT NULL,
    "workArea" TEXT,
    "counselorName" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUp_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_responsibleId_fkey" FOREIGN KEY ("responsibleId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "FollowUp_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Therapy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "key" TEXT NOT NULL,
    "nameEs" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'THERAPY',
    "sortOrder" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "StudentTherapy" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "therapyId" TEXT NOT NULL,
    "therapistId" TEXT,
    "startDate" TEXT NOT NULL,
    "endDate" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "StudentTherapy_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StudentTherapy_therapyId_fkey" FOREIGN KEY ("therapyId") REFERENCES "Therapy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StudentTherapy_therapistId_fkey" FOREIGN KEY ("therapistId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "therapyId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "durationMinutes" INTEGER,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "professionalName" TEXT NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Attendance_therapyId_fkey" FOREIGN KEY ("therapyId") REFERENCES "Therapy" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Attendance_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "attendanceId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "data" BLOB NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'image/png',
    "signerName" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Signature_attendanceId_fkey" FOREIGN KEY ("attendanceId") REFERENCES "Attendance" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "rowsJson" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PREVIEW',
    "createdById" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportBatch_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "updatedById" TEXT
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_active_idx" ON "User"("role", "active");

-- CreateIndex
CREATE UNIQUE INDEX "Course_name_year_key" ON "Course"("name", "year");

-- CreateIndex
CREATE INDEX "UserCourse_courseId_idx" ON "UserCourse"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "UserCourse_userId_courseId_key" ON "UserCourse"("userId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_documentId_key" ON "Student"("documentId");

-- CreateIndex
CREATE INDEX "Student_courseId_active_idx" ON "Student"("courseId", "active");

-- CreateIndex
CREATE INDEX "Student_lastName_firstName_idx" ON "Student"("lastName", "firstName");

-- CreateIndex
CREATE UNIQUE INDEX "Domain_key_key" ON "Domain"("key");

-- CreateIndex
CREATE INDEX "ObservationCycle_courseId_dateFrom_idx" ON "ObservationCycle"("courseId", "dateFrom");

-- CreateIndex
CREATE UNIQUE INDEX "ObservationCycle_courseId_year_period_key" ON "ObservationCycle"("courseId", "year", "period");

-- CreateIndex
CREATE INDEX "Observation_studentId_observationDate_idx" ON "Observation"("studentId", "observationDate");

-- CreateIndex
CREATE UNIQUE INDEX "Observation_cycleId_studentId_key" ON "Observation"("cycleId", "studentId");

-- CreateIndex
CREATE INDEX "ObservationScore_domainId_level_idx" ON "ObservationScore"("domainId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "ObservationScore_observationId_domainId_key" ON "ObservationScore"("observationId", "domainId");

-- CreateIndex
CREATE INDEX "FollowUp_studentId_followUpDate_idx" ON "FollowUp"("studentId", "followUpDate");

-- CreateIndex
CREATE INDEX "FollowUp_status_followUpDate_idx" ON "FollowUp"("status", "followUpDate");

-- CreateIndex
CREATE UNIQUE INDEX "Therapy_key_key" ON "Therapy"("key");

-- CreateIndex
CREATE INDEX "StudentTherapy_therapyId_active_idx" ON "StudentTherapy"("therapyId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "StudentTherapy_studentId_therapyId_key" ON "StudentTherapy"("studentId", "therapyId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_studentId_date_idx" ON "Attendance"("studentId", "date");

-- CreateIndex
CREATE INDEX "Attendance_therapyId_date_idx" ON "Attendance"("therapyId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_date_therapyId_startTime_key" ON "Attendance"("studentId", "date", "therapyId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_attendanceId_role_key" ON "Signature"("attendanceId", "role");
