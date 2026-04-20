import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import pinoHttp from "pino-http";
import helmet from "helmet";
import router from "./routes";
import { logger } from "./lib/logger";
import { main as runDemoSeed } from "./demoSeed";
import { main as runDemoSeedContinue } from "./demoSeedContinue";
import { main as runDemoSeedPatients } from "./demoSeedPatients";

const PgSession = ConnectPgSimple(session);

const SESSION_MAX_AGE = 8 * 60 * 60 * 1000; // 8 hours

// Allowed origins: same replit domains + localhost for dev
const ALLOWED_ORIGINS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /\.replit\.dev$/,
  /\.repl\.co$/,
  /\.replit\.app$/,
  /\.worf\.replit\.dev$/,
  /^https?:\/\/(www\.)?admitsimple\.com$/,
];

const app: Express = express();

// ── Trust the Replit / reverse-proxy TLS termination ─────────────────────────
// Without this, req.secure is always false behind the proxy, which prevents
// the session cookie (secure:true in production) from ever being set.
app.set("trust proxy", 1);

// ── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // managed by the React app
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  })
);

// ── Request logging (strips query strings + bodies to avoid PHI in logs) ───
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  })
);

// ── CORS ─────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // server-to-server, health checks
      const allowed = ALLOWED_ORIGINS.some((re) => re.test(origin));
      cb(null, allowed);
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(cookieParser());

// ── Sessions (stored in Postgres, rolling expiry on each request) ──────────
app.use(
  session({
    store: new PgSession({
      conString: process.env.DATABASE_URL,
      tableName: "user_sessions",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || "admitsimple-dev-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    rolling: true, // reset maxAge on every request (inactivity timeout)
    cookie: {
      httpOnly: true,
      secure: process.env.SECURE_COOKIES === "true",
      sameSite: "lax",
      maxAge: SESSION_MAX_AGE,
    },
  })
);

// ── Prevent caching of authenticated API responses ─────────────────────────
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Pragma", "no-cache");
  next();
});

// ── POST /api/admin/seed-demo (public — auth via ADMIN_PASSWORD header) ───────
// Bypasses session auth so it can be called before any users are logged in.
// Mount before main router to avoid the per-subrouter requireAuth middleware.
let seedInProgress = false;
app.post("/api/admin/seed-demo", async (req: Request, res: Response) => {
  const password = (process.env.ADMIN_PASSWORD || "").trim();
  const headerVal = req.headers["x-admin-password"];
  const authVal = req.headers["authorization"];
  const provided = (
    (Array.isArray(headerVal) ? headerVal[0] : headerVal) ||
    ((Array.isArray(authVal) ? authVal[0] : authVal) || "").replace(/^Bearer\s+/i, "")
  ).trim();
  if (!password || provided !== password) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (seedInProgress) {
    res.status(409).json({ error: "Seed already in progress" });
    return;
  }
  seedInProgress = true;
  try {
    logger.info("[seed-demo] Starting demo seed via API...");
    await runDemoSeed();
    await runDemoSeedContinue();
    await runDemoSeedPatients();
    logger.info("[seed-demo] All seed steps complete.");
    res.json({ ok: true, message: "Demo data seeded successfully." });
  } catch (err: any) {
    logger.error({ err }, "[seed-demo] Seed error");
    res.status(500).json({ error: err.message || "Seed failed" });
  } finally {
    seedInProgress = false;
  }
});

app.use("/api", router);

export default app;
