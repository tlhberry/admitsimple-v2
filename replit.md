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
5. **Analytics Dashboard** — KPI cards, trend charts, payer mix, staff performance
6. **Reports** — AI-generated reports (weekly, monthly, referral, financial, census)
7. **Referral Sources** — Manage and track referral relationships
8. **Settings** — Facility info, notifications, AI configuration

## AI Routes (7 total)

All use Claude claude-opus-4-5 via Replit AI Integrations:
- `POST /api/ai/parse-intake` — Screenshot/image parser for intake forms
- `POST /api/ai/insights` — Admissions trend analysis
- `POST /api/ai/referral-insights` — Referral source analysis
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

`users`, `inquiries`, `patients`, `pipeline_stages`, `activities`, `reports`, `settings`, `referral_sources`, `insurance_verifications`, `audit_logs`
