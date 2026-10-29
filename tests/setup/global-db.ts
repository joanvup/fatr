import { execSync } from "node:child_process";
import { rmSync } from "node:fs";
import path from "node:path";

const DATABASE_URL = "file:../data/test-integration.db";

export default function setup() {
  const databasePath = path.join(process.cwd(), "data", "test-integration.db");
  for (const suffix of ["", "-journal", "-wal", "-shm"]) {
    rmSync(`${databasePath}${suffix}`, { force: true });
  }
  execSync("npx prisma db push --skip-generate", {
    cwd: process.cwd(),
    env: { ...process.env, DATABASE_URL },
    stdio: "inherit",
  });
}
