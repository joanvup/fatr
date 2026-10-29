import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function stamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, "0");
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

try {
  await prisma.$queryRawUnsafe("PRAGMA wal_checkpoint(TRUNCATE)");
  const source = path.join(process.cwd(), "data", "fatr.db");
  const targetDir = path.join(process.cwd(), "backups");
  mkdirSync(targetDir, { recursive: true });
  const target = path.join(targetDir, `fatr-${stamp()}.db`);
  copyFileSync(source, target);
  console.log(`Respaldo creado: ${target}`);
} finally {
  await prisma.$disconnect();
}
