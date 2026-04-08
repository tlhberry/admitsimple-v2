# Claude Deployment Prompt
## Copy and paste everything below this line into Claude

---

You are going to help me fully deploy my web application called **AdmitSimple** to AWS and make it production-ready, HIPAA-compliant, and set up so I can onboard new clients quickly. I am giving you access to my GitHub, my AWS console, and an EC2 instance. Work through this step by step and do not stop until everything is complete and live.

---

## What AdmitSimple Is

AdmitSimple is a HIPAA-conscious Admissions CRM for addiction treatment centers. It manages patient inquiries, tracks them through an 8-stage admissions pipeline, handles inbound phone calls and SMS, and uses AI to assist admissions staff.

**Business model — I operate two ways:**
1. **SaaS (multi-tenant):** Treatment centers subscribe and use my hosted version at their own subdomain (e.g. sunrise.admitsimple.com)
2. **Perpetual license:** I sell the entire app to a client and deploy it on their own AWS account — they own it and I provide support

---

## Tech Stack

- **Frontend:** React + Vite + TypeScript + Tailwind CSS
- **Backend:** Node.js + Express + TypeScript
- **Database:** PostgreSQL with Drizzle ORM
- **AI:** Anthropic Claude API (claude-opus-4-5)
- **Phone/SMS:** Twilio Voice + SMS
- **Auth:** Session-based (bcrypt passwords, express-session)
- **Containerization:** Docker (two images — API server + web frontend via nginx)
- **Infrastructure as Code:** Terraform
- **CI/CD:** GitHub Actions

---

## What Already Exists in the Repo

The `deploy/` folder is fully built. Here is what's in it:

```
deploy/
  Dockerfile.api          — builds the Express API server
  Dockerfile.web          — builds the React frontend (nginx serving static files)
  docker-compose.yml      — for local testing / simple EC2 deployments
  nginx.conf              — reverse proxy config (hardened, H2C smuggling mitigated)
  scripts/
    new-client.sh         — one-command script to spin up a full new client AWS environment
    update-all-clients.sh — push updates to all deployed clients at once
  terraform/
    main.tf               — full HIPAA-compliant AWS infrastructure (VPC, ECS Fargate, RDS PostgreSQL encrypted, ALB, ACM SSL, CloudTrail, IAM)
    variables.tf
    outputs.tf
  clients/                — (gitignored) .tfvars file per deployed client
```

**The infrastructure Terraform creates per client:**
- VPC with public/private subnets across 2 AZs
- ECS Fargate cluster running two tasks (api + web containers)
- RDS PostgreSQL db.t3.micro with encryption at rest
- Application Load Balancer with HTTPS (ACM certificate)
- CloudWatch log groups
- CloudTrail audit logging (HIPAA requirement)
- S3 bucket for Terraform state (encrypted, versioned)
- ECR repository for Docker images
- All secrets stored in AWS Secrets Manager

---

## Environment Variables Required

The app needs these environment variables at runtime:

```
NODE_ENV=production
PORT=3001
DATABASE_URL=postgres://admitsimple:<password>@<rds-host>:5432/admitsimple
SESSION_SECRET=<random 48+ char string>
ADMIN_PASSWORD=<admin login password>
TWILIO_ACCOUNT_SID=<from twilio console>
TWILIO_AUTH_TOKEN=<from twilio console>
TWILIO_PHONE_NUMBER=<e.g. +16025551234>
TWILIO_TWIML_APP_SID=<from twilio console — voice app SID>
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=https://api.anthropic.com
AI_INTEGRATIONS_ANTHROPIC_API_KEY=<anthropic api key>
```

---

## GitHub Actions CI/CD

Set up GitHub Actions so that every push to `main` automatically:
1. Builds both Docker images (API + Web)
2. Pushes them to ECR
3. Triggers a rolling ECS deployment for all active clients

Required GitHub Secrets to add:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION` (e.g. us-east-1)
- `ECR_REPOSITORY_URL`

---

## The Old EC2 Instance

There is an existing EC2 instance (id: i-0d0ef6e34932c7b49, name: "Admissions CRM") running the old version. It has no live data. **Stop or terminate it** — we are replacing it entirely with the new ECS-based deployment.

---

## HIPAA Compliance Checklist (Must Complete)

- [ ] All data encrypted at rest (RDS encryption enabled in Terraform)
- [ ] All data encrypted in transit (HTTPS enforced, SSL on RDS)
- [ ] CloudTrail enabled for all API activity audit logging
- [ ] VPC with private subnets — RDS not publicly accessible
- [ ] Security groups locked down (only ALB can reach containers, only containers can reach RDS)
- [ ] Secrets in AWS Secrets Manager (not hardcoded or in env files)
- [ ] S3 buckets encrypted + versioned
- [ ] IAM roles with least-privilege (ECS task role, not admin keys)
- [ ] CloudWatch alarms for unusual activity
- [ ] HTTP → HTTPS redirect enforced at ALB
- [ ] Session cookies: HttpOnly, Secure, SameSite=Strict

---

## Step-by-Step Tasks — Work Through These In Order

### Phase 1: AWS Account Setup
1. Create an IAM user for deployments with AdministratorAccess (or scoped permissions for ECS, ECR, RDS, VPC, ACM, CloudTrail, S3, Secrets Manager, IAM)
2. Generate Access Key + Secret Key for that user — you'll need these for GitHub Actions and local CLI
3. Create an ECR repository named `admitsimple` in us-east-1

### Phase 2: GitHub Setup
1. Add the required GitHub Secrets listed above to the repository
2. Create a GitHub Actions workflow at `.github/workflows/deploy.yml` that:
   - Triggers on push to `main`
   - Builds `deploy/Dockerfile.api` and `deploy/Dockerfile.web`
   - Tags images with both `latest` and the git SHA
   - Pushes to ECR
   - Runs `aws ecs update-service --force-new-deployment` for each client's ECS cluster

### Phase 3: First Client Deployment
1. Make sure Terraform is installed locally or run it from a build environment
2. Create an S3 bucket named `admitsimple-terraform-state` with versioning + AES256 encryption
3. Create a `deploy/clients/my-facility.tfvars` file with the client's values (name, domain, passwords, Twilio creds, Anthropic key)
4. Run `terraform init` then `terraform apply -var-file=deploy/clients/my-facility.tfvars`
5. Note the ALB DNS output — this becomes the CNAME target
6. Once ECS tasks are healthy, run DB migrations: `pnpm --filter @workspace/db run push-force` (via ECS exec or a migration task)

### Phase 4: DNS + SSL
1. In the client's domain registrar (or Route 53), add a CNAME record:
   - Name: the client's subdomain (e.g. `app.sunriserecovery.com`)
   - Value: the ALB DNS name from Terraform output
2. ACM will automatically validate and issue the SSL certificate (DNS validation)
3. Once DNS propagates, test HTTPS access

### Phase 5: Twilio Webhooks
1. Log in to Twilio console
2. Go to Phone Numbers → the client's number
3. Set Voice webhook: `https://<client-domain>/api/webhooks/twilio/inbound-call` (POST)
4. Set SMS webhook: `https://<client-domain>/api/webhooks/twilio/sms` (POST)
5. Create a TwiML App for browser-based calling:
   - Voice Request URL: `https://<client-domain>/api/webhooks/twilio/voice`
   - Save the App SID and add it as `TWILIO_TWIML_APP_SID` in the ECS task's environment

### Phase 6: Verify Everything
1. Visit `https://<client-domain>` — should see login page
2. Log in with admin / the password set in tfvars
3. Go to Settings → AI Settings → enter Anthropic API key
4. Go to Settings → Facility → fill in facility info
5. Make a test inbound call to the Twilio number
6. Send a test SMS to the Twilio number
7. Create a test inquiry and verify it moves through the pipeline
8. Confirm CloudTrail is logging in AWS Console → CloudTrail → Event History

---

## New Client Onboarding — Fast Path

Once Phase 1–4 are complete for the first client, adding a new client takes about 15 minutes:

```bash
./deploy/scripts/new-client.sh
```

This script prompts for the client's name, domain, and credentials, then runs Terraform automatically. After it finishes, just add the CNAME record and configure Twilio webhooks.

---

## Perpetual License / Client-Owned AWS Deployment

For clients who buy the full app:
1. Have the client create a new AWS account (free, goes under their billing)
2. Have them create an IAM user with AdministratorAccess and share the Access Key / Secret Key with you temporarily
3. Run the same `new-client.sh` script but pointed at their AWS account (`aws configure` with their credentials first)
4. When done, revoke the temporary IAM key — their ECS tasks run on their own IAM roles
5. They own the infrastructure; you just support the software

---

## Estimated Monthly AWS Cost Per Client

| Service | ~Monthly |
|---|---|
| ECS Fargate (2 tasks) | $35–50 |
| RDS PostgreSQL (t3.micro) | $15–25 |
| Application Load Balancer | $20 |
| NAT Gateway | $35 |
| ECR + S3 | $3–8 |
| CloudTrail + CloudWatch | $5–15 |
| **Total** | **~$110–155/month** |

---

## Important Notes

- **Trust proxy is critical** — the Express app has `app.set("trust proxy", 1)` which must stay in place for sessions to work behind the ALB
- **DB migrations** use `pnpm --filter @workspace/db run push-force` — never write raw SQL migrations
- **No empty string SelectItem values** — the frontend uses sentinel value `"none"` instead of `""` (shadcn bug workaround)
- **Admin password** is set via `ADMIN_PASSWORD` env var — the app auto-creates/updates the admin user on startup
- **Session secret** must be at least 48 random characters — generate with `openssl rand -base64 48`

---

Begin with Phase 1 and work through all phases without stopping. Let me know when each phase is complete and what the outputs are (ALB DNS, ECR URL, etc.) so I can update DNS records.
