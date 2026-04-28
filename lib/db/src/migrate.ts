import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  // In production the build copies lib/db/migrations → dist/migrations,
  // so __dirname is the dist folder and migrations live right next to it.
  // In dev __dirname is lib/db/src, so we go up one level to lib/db/migrations.
  const migrationsFolder =
    process.env.MIGRATIONS_PATH ||
    path.join(__dirname, "migrations");
  await migrate(db, { migrationsFolder });
}
