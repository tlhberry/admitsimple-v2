# Deployment Log

A running record of production deployments to admitsimple.com.

---

## 2026-04-20 — API container rebuild (admin password fix)

**Server:** EC2 i-0d0ef6e34932c7b49 ("Admissions CRM"), IP 3.223.7.206

**Access method:** AWS Console → Session Manager (no SSH key required)

**Command run:**
```bash
cd ~/new-app && git pull && docker compose -f deploy/docker-compose.yml up -d --build api
```

**Outcome:**
- ✓ Image `deploy-api` — Built
- ✓ Network `deploy_default` — Created
- ✓ Volume `deploy_postgres_data` — Created
- ✓ Container `deploy-db-1` — Healthy
- ✓ Container `deploy-api-1` — Started

**Why:** The bcrypt hashing fix for the `admin` user password had been applied to
the codebase but the EC2 server was still running the old container. This rebuild
applies the fix so that `admin` / `admin` works on the production login page.

**Acceptance checks:**
- [ ] Login at admitsimple.com/app/ with `admin` / `admin` — pending user confirmation
- [ ] Demo seed data visible in pipeline board — pending user confirmation

**Notes:**
- No SSH key is stored in this project. Use AWS Session Manager for all future
  direct EC2 access (EC2 Console → Connect → Session Manager tab).
- For future deployments without manual server access, see follow-up task #9.
