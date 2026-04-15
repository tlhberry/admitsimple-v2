import { migrate } from "drizzle-orm/node-postgres/migrator";
import { db } from "./index";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function runMigrations(): Promise<void> {
  const migrationsFolder =
    process.env.MIGRATIONS_PATH ||
    path.join(__dirname, "../migrations");
  await migrate(db, { migrationsFolder });
}
