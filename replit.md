# AdmitSimple — HIPAA-Conscious Admissions CRM

A full-stack admissions CRM built for addiction treatment centers with AI-powered insights.

## Architecture

- **Frontend**: React + Vite at `/` (artifact: `admit-simple`)
- **Backend**: Express.js API at port 8080 (artifact: `api-server`)
- **Database**: PostgreSQL + Drizzle ORM
- **AI**: Anthropic Claude via Replit AI Integrations proxy
- **Monorepo**: pnpm workspaces

## Project Structure

```
artifacts/
  admit-simple/         # React frontend
    src/
      pages/            # All page components
        dashboard.tsx
        inquiries/      # List + Detail
        patients/
        pipeline/       # Kanban board
        referrals/
        analytics/
        reports/
        ai-insights/
        bed-board/
        settings/
        login.tsx
      components/
        layout/         # Sidebar + Layout
        ui/             # shadcn/ui components
        CreateInquiryForm.tsx
      hooks/
        use-auth.tsx    # Auth context
        use-inquiries.ts
        use-patients.ts
        use-ai.ts
      lib/utils.ts

  api-server/           # Express backend
    src/
      routes/
        auth.ts         # Login/logout/me
        inquiries.ts    # CRUD + convert-to-patient
        patients.ts     # Patient management
        activities.ts   # Activity log
        pipeline.ts     # Kanban stage config + pipeline view
        analytics.ts    # Dashboard + charts
        referrals.ts    # Referral source management
        reports.ts      # Report CRUD
        settings.ts     # Facility settings
        ai.ts           # 7 AI routes (Claude)
        users.ts        # User management
      lib/
        requireAuth.ts  # Auth middleware
        logger.ts       # Pino logger
      seed.ts           # Demo data seeder
      app.ts            # Express app config
      index.ts          # Server entry point

lib/
  db/                   # Database schema (Drizzle)
    src/schema/admitsimple.ts
  api-spec/             # OpenAPI spec (source of truth)
    openapi.yaml
  api-client-react/     # Generated React Query hooks (codegen)
```

## Key Features

1. **Inquiry Management** — Full CRUD with priority, status, and assignment
2. **Patient Tracking** — Census management with level-of-care tracking
3. **Kanban Pipeline** — Drag-and-drop admissions pipeline (5 stages)
4. **AI Intelligence Hub** — Admissions trends, referral insights, custom queries
5. **Analytics Dashboard** — KPI cards, trend charts, payer mix, staff performance + BD metrics
6. **Reports** — AI-generated reports (weekly, monthly, referral, financial, census)
7. **Referral Sources** — Manage and track referral relationships
8. **Pre-Assessment Forms** — 3-form pre-assessment workflow (Pre-Cert, Nursing Assessment, Pre-Screening) with auto-save, ZIP download, and status advancement
9. **Business Development Module** — Referral account management, contact tracking, BD activity logs, AI referral insights
10. **Bed Board** — Real-time bed availability tracker with AI Q&A (natural language filter, group, predict discharge)
11. **Insurance Verification (VOB)** — Per-inquiry VOB form with AI "Fill with AI" (paste text or upload image/PDF), in/out-of-network fields, pre-cert, quote info, and Cost Acceptance decision panel
12. **Did Not Admit Workflow** — "Did Not Admit" modal with reason list + notes, sets inquiry to Non-Viable, shows red banner on detail page
13. **Refer Out** — "Refer Out" modal with Text/Email method, AI-generated message, records referral out with amber badge
14. **Settings** — Facility info, notifications, AI configuration (admin-only)
15. **User Management** — Admin-only Users tab in Settings: list all users, create with auto-generated initials and password generator, edit role, disable/enable, reset password; role-based access control (Admin / Admissions Rep / BD Rep)
16. **Real-Time Inbound Call System** — SSE-based push notifications; IncomingCallBanner slides in from top-right; CTM webhook at `POST /api/webhooks/ctm` deduplicates by phone, sets `callStatus = "ringing"`, broadcasts SSE; 15-second auto-miss timer; agent_name-to-user fuzzy match for direct assignment with targeted SSE
17. **Call Ownership / One-Call-One-Owner** — `callStatus` (ringing/active/completed/missed), `isLocked`, `lockedAt` columns; `POST /api/inquiries/:id/claim` atomically locks a call to the first claimant (409 if race-lost); `GET /api/calls/active` admin view; LiveCallMode auto-claims on entry and shows lock screen if owned by another rep; Active Calls page at `/calls/active` shows all live calls with Claim/Resume/View actions; sidebar badge counts active calls; detail.tsx shows amber "Call in Progress" banner when another rep owns the active call

## BD Module (routes/bd.ts)

Tables: `referral_accounts`, `referral_contacts`, `bd_activity_logs`
- `GET/POST /api/referral-accounts` — List/create referral accounts
- `GET/PATCH/DELETE /api/referral-accounts/:id` — Account detail CRUD
- `GET/POST /api/referral-accounts/:id/contacts` — Account contacts
- `PATCH/DELETE /api/referral-contacts/:id` — Contact CRUD
- `GET/POST /api/referral-accounts/:id/activities` — Account activity log
- `GET/POST /api/bd-activities` — Global activity feed
- `GET /api/bd-analytics` — BD metrics (accounts, active accounts 30d, activities by type, top reps)
- `POST /api/ai/referral-insights` — AI insights for a referral account

Account types: hospital, private_practice, mat_clinic, outpatient_facility, residential_facility, attorneys, ed_consultant, community, other
Activity types: face_to_face, phone_call, email, meeting, lunch, presentation, other
RBAC: bd_rep sees only own accounts/activities; admin+staff see all

## AI Routes (8 total)

All use Claude claude-opus-4-5 via Replit AI Integrations:
- `POST /api/ai/parse-intake` — Screenshot/image parser for intake forms
- `POST /api/ai/insights` — Admissions trend analysis
- `POST /api/ai/referral-insights` — Referral source analysis (also used by BD module)
- `POST /api/ai/pipeline-optimize` — Pipeline bottleneck recommendations
- `POST /api/ai/reports` — Executive report generation
- `POST /api/ai/summarize-inquiry` — Clinical inquiry summary
- `POST /api/ai/custom-query` — Natural language facility data query

## Authentication

- Session-based (express-session) with httpOnly cookies
- Default credentials: `admin` / `admin123`
- HIPAA design: No PHI sent to Claude AI (aggregate data only, except screenshot parser)

## Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `SESSION_SECRET` — Session encryption key
- `PORT` — Server port (auto-assigned per artifact)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` — Auto-set by Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` — Auto-set by Replit AI Integrations

## Demo Seed Data

Loaded on first startup:
- 4 users (admin, 2 staff, 1 clinical)
- 5 pipeline stages
- 4 referral sources
- 7 sample inquiries (various statuses)
- 3 active patients
- 16 system settings

## Database Tables

`users`, `inquiries`, `patients`, `pipeline_stages`, `activities`, `reports`, `settings`, `referral_sources`, `insurance_verifications`, `audit_logs`, `referral_accounts`, `referral_contacts`, `bd_activity_logs`

## Ownership & Credit Tracking

- **Inquiry ownership**: `inquiries.assignedTo` auto-set to creator's userId on POST
- **Referral source ownership**: `referral_sources.ownedByUserId` set on create; admin-only change via PUT; `ownerName` returned in GET /api/referrals
- **Admissions credit**: `patients.creditUserId` set from `inq.assignedTo` on convertToPatient; admin can override via `PATCH /api/patients/:id/credit` (tracks `creditOverrideBy` + `creditOverriddenAt`)

## Audit Logging

- Helper: `artifacts/api-server/src/lib/logAudit.ts` — exports `logAudit(req, action, resourceType, resourceId?)`
- Logged events: inquiry create/update, patient convert, activity create, referral CRUD
- GET `/api/audit-logs` — returns last 200 audit log entries (auth required)
- Also exports `getInitials(name: string)` for 2-letter initials

## BD Reports

- Page: `/bd-reports` in the frontend sidebar
- API: `GET /api/bd-reports` returns per-rep array: `{ userId, name, initials, role, f2fThisWeek, f2fThisMonth, creditedAdmissions, admissionsBySource[] }`
- KPI cards: F2F This Week, F2F This Month, Total Credited Admits
- Per-rep table with expandable admitted-by-source breakdown

## Google PPC / Organic Search Keywords

- `inquiries.searchKeywords` column stores keywords when lead source is "Google PPC" or "Google Organic"
- Shown conditionally in Create Inquiry form and in the Lead Source inline-edit section of inquiry detail
- Returned in `fullInquirySelect` join

## Activity Display

- Activities tab in inquiry detail shows a timeline with colored initials badges
- If activity has a `userId` linked, shows 2-letter initials with primary color badge
- Seeded/legacy activities (no userId) show a plain Activity icon fallback

## User Roles & RBAC

- **admin** — Full access, User Management, Settings, can change pipeline stages
- **admissions** — Full operational access (inquiries, patients, pipeline, VOB)
- **bd** — BD reps: can create inquiries, cannot change inquiry status/pipeline, non-admit, or refer-out
- Settings page (including Users tab) hidden from non-admin in sidebar
- `requireAdmin` middleware: `artifacts/api-server/src/lib/requireAdmin.ts`
- `isBdRep(req)` helper used in inquiries.ts to block status changes

## DB Migration Notes

- `drizzle-kit push --force` is safe to use — `tablesFilter: ["!user_sessions"]` in `lib/db/drizzle.config.ts` protects the `user_sessions` table from being dropped
- The `user_sessions` table is managed by `connect-pg-simple`, NOT by Drizzle schema
- If `user_sessions` is accidentally dropped, recreate with: `CREATE TABLE "user_sessions" ("sid" varchar NOT NULL COLLATE "default", "sess" json NOT NULL, "expire" timestamp(6) NOT NULL, CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("sid"))`
- Pipeline status logic: inquiry `status` field stores exact stage name after drag; legacy statuses: `new`→"New Inquiry", `contacted`→"Initial Contact", `qualified`→"Insurance Verification"

## Known Issues / Deferred Investigation

### The "7 Problem" (SMS Unread Badge)
- A badge showing "7" appeared on the Active Calls nav item (teal SMS unread badge).
- Root cause not fully determined. Observations:
  - `GET /api/sms/unread-count` was previously 404-ing (route had `/unread-count` instead of `/sms/unread-count`) — fixed.
  - DB shows 0 unread inbound SMS messages and 0 active/ringing calls.
  - Despite the fix, the frontend still showed 7 — likely a stale React Query in-memory cache entry from an earlier session where the count was genuinely 7.
  - `GET /api/calls/active` consistently returns HTTP 304, meaning the browser HTTP cache ETag matches, but the origin of the cached 7-item value is unclear.
- **Interim fix**: SMS unread `smsBadge` prop hard-set to `undefined` in Sidebar (both desktop and mobile nav) — badge no longer renders.
- **To investigate**: Whether there is a persistent source of stale data (HTTP cache, React Query persistence, or DB records) that could cause incorrect badge counts in production. Check if `call_status` values are being properly reset after calls end.
