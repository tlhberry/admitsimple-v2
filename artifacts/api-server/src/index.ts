import app from "./app";
import { logger } from "./lib/logger";
import { seedDatabase } from "./seed";
import { db } from "@workspace/db";
import { users } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function runRecoveryReset() {
  const adminPw = process.env["RECOVERY_ADMIN_PW"];
  const staffPw = process.env["RECOVERY_STAFF_PW"];
  if (!adminPw && !staffPw) return;
  logger.warn("RECOVERY: Password reset env vars found — resetting passwords");
  try {
    if (adminPw) {
      const hash = await bcrypt.hash(adminPw, 12);
      await db.update(users).set({ password: hash }).where(eq(users.username, "admin"));
      logger.warn("RECOVERY: admin password reset complete");
    }
    if (staffPw) {
      for (const uname of ["jsmith", "mwilson", "drjones", "austinb"]) {
        const hash = await bcrypt.hash(staffPw, 12);
        await db.update(users).set({ password: hash }).where(eq(users.username, uname));
        logger.warn(`RECOVERY: ${uname} password reset complete`);
      }
    }
    logger.warn("RECOVERY: Done. Delete RECOVERY_ADMIN_PW + RECOVERY_STAFF_PW env vars and redeploy.");
  } catch (err) {
    logger.error(err, "RECOVERY: Password reset failed");
  }
}

seedDatabase().catch(err => {
  logger.error(err, "Failed to seed database");
});

runRecoveryReset().catch(err => {
  logger.error(err, "Recovery reset failed");
});

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
