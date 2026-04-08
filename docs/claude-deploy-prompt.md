# PASTE THIS INTO CLAUDE
# Before you paste this — do NOT give Claude access to any existing GitHub repo yet.
# The new repo gets created in the steps below.

---

You are deploying AdmitSimple to AWS. Execute every step in order. Only pause to ask me for credentials you cannot generate yourself. Do not stop until HTTPS is live and I can log in.

**CRITICAL BEFORE YOU DO ANYTHING:**
The production-ready version of this app lives inside a **Replit workspace** — not on GitHub yet. Any GitHub repo you may already have access to is the OLD version. Ignore any existing GitHub repos entirely. Your first job is to get me to push the code from Replit to a brand new GitHub repository. Do not look at any code, do not make any infrastructure decisions, until I give you the URL of the new repo in Step 2.

---

## STEP 1 — COLLECT CREDENTIALS

Ask me for all of these at once right now, then do not ask again:

1. Domain name (e.g. `app.admitsimple.com`)
2. Admin login password (what I want to use to log in)
3. Anthropic API key (starts with `sk-ant-` — or say "skip" and I'll add it in Settings later)
4. Twilio Account SID, Auth Token, and Phone Number (or say "skip" to set up calling later)

---

## STEP 2 — PUSH REPLIT CODE TO GITHUB (DO THIS BEFORE ANYTHING ELSE)

Tell me to do the following inside Replit right now. Wait for me to finish before moving on:

> "Go into your Replit project. On the left sidebar click the **Git** icon (looks like a branch). Click **Connect to GitHub**. Authorize Replit. When it asks for a repo name, type `admitsimple` and set it to **Private**. Then click **Push**. When it finishes, paste the GitHub repo URL here."

Wait for me to paste the URL. Then open that repo and verify **all** of these files are present. If any single one is missing, stop immediately and tell me exactly which ones are missing:

```
deploy/Dockerfile.api
deploy/Dockerfile.web
deploy/terraform/main.tf
deploy/terraform/variables.tf
deploy/terraform/outputs.tf
deploy/scripts/new-client.sh
deploy/scripts/update-all-clients.sh
deploy/nginx.conf
.github/workflows/deploy.yml
```

Once you confirm all files exist, continue.

---

## STEP 3 — CREATE AWS IAM DEPLOY USER

Walk me through this step by step in the AWS console:

1. IAM → Users → Create user
2. Username: `admitsimple-deploy`
3. No console access
4. Attach policy: **AdministratorAccess**
5. Security credentials → Create access key → "Application running outside AWS"
6. Tell me to paste both keys to you

---

## STEP 4 — CREATE ECR REPOSITORY

Walk me through:
1. ECR → Create repository → Private
2. Name: `admitsimple`
3. Scan on push: ON
4. Encryption: AES-256
5. Tell me to paste the full URI to you (format: `123456789.dkr.ecr.us-east-1.amazonaws.com/admitsimple`)

---

## STEP 5 — CREATE TERRAFORM STATE S3 BUCKET

Walk me through:
1. S3 → Create bucket
2. Name: `admitsimple-terraform-state`
3. Region: `us-east-1`
4. Block all public access: ON
5. Versioning: Enable
6. Encryption: SSE-S3

---

## STEP 6 — ADD GITHUB SECRETS

Walk me through on GitHub (new `admitsimple` repo):
1. Settings → Secrets and variables → Actions → New repository secret
2. Add `AWS_ACCESS_KEY_ID` → paste value from Step 3
3. Add `AWS_SECRET_ACCESS_KEY` → paste value from Step 3

---

## STEP 7 — CREATE THE CLIENT CONFIG FILE

Tell me to create this file directly in the GitHub web UI at this exact path:
`deploy/clients/main.tfvars`

(Use GitHub web UI → Add file → Create new file. This bypasses .gitignore.)

Generate the two secrets now and include them in the file:
- session_secret → `openssl rand -base64 48`
- db_password → `openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20`

Write the complete file contents for me to paste, with every value filled in using what I gave you in Step 1 and the ECR URI from Step 4:

```hcl
client_name          = "main"
domain               = "[DOMAIN FROM STEP 1]"
aws_region           = "us-east-1"
admin_password       = "[ADMIN PASSWORD FROM STEP 1]"
session_secret       = "[GENERATED]"
db_password          = "[GENERATED]"
twilio_account_sid   = "[FROM STEP 1 OR EMPTY STRING]"
twilio_auth_token    = "[FROM STEP 1 OR EMPTY STRING]"
twilio_phone_number  = "[FROM STEP 1 OR EMPTY STRING]"
twilio_twiml_app_sid = ""
anthropic_base_url   = "https://api.anthropic.com"
anthropic_api_key    = "[FROM STEP 1 OR EMPTY STRING]"
ecr_repository_url   = "[ECR URI FROM STEP 4]"
image_tag            = "latest"
```

Tell me to paste it in, commit directly to main, then confirm when done.

---

## STEP 8 — WATCH THE DEPLOYMENT

After the commit, tell me to:
1. Go to GitHub → Actions tab
2. Watch the **"Build & Deploy AdmitSimple"** workflow that started automatically

Walk me through what each stage means as it runs:
- **Build Docker Images** (~5 min) — packages the app into containers, pushes to ECR
- **Deploy to Clients** (~10 min) — Terraform creates VPC, ECS cluster, RDS database, load balancer, SSL cert in AWS
- **ECS update** (~3 min) — live app starts running

Tell me to paste any error output if it fails. Otherwise wait for green checkmarks on both jobs.

---

## STEP 9 — GET THE ALB DNS AND SSL INFO

Walk me through:
1. AWS → EC2 → Load Balancers → find `admitsimple-main-alb`
2. Copy the **DNS name** (e.g. `admitsimple-abc123.us-east-1.elb.amazonaws.com`)
3. AWS → ACM → find certificate for my domain → if status is "Pending validation", copy the CNAME name and value

Tell me to paste both to you.

---

## STEP 10 — SET UP DNS

Tell me which registrar to go to (GoDaddy, Cloudflare, Namecheap, Route 53 — ask me if you don't know).

Tell me exactly what to add:

**Record 1 — points the domain to the app:**
- Type: CNAME
- Name: [the subdomain — e.g. `app`, or `@` if using root domain]
- Value: [ALB DNS from Step 9]
- TTL: 300

**Record 2 — proves I own the domain so SSL can issue (only if ACM showed Pending):**
- Type: CNAME
- Name: [the `_abc123...` string from ACM]
- Value: [the `_xyz...acm-validations.aws` string from ACM]
- TTL: 300

After I add them, check every few minutes with `nslookup [DOMAIN]`. SSL validation takes up to 30 min. Continue to Step 11 while waiting.

---

## STEP 11 — TERMINATE THE OLD EC2 INSTANCE

Walk me through:
1. EC2 → Instances → find "Admissions CRM" (i-0d0ef6e34932c7b49)
2. Instance State → Terminate instance
3. EC2 → Elastic IPs → release any unattached IPs to stop charges

---

## STEP 12 — TWILIO WEBHOOKS

Walk me through in Twilio console (console.twilio.com):

**Incoming calls:**
- Phone Numbers → Active Numbers → click the number
- Voice section → When a call comes in: `https://[DOMAIN]/api/webhooks/twilio/inbound-call` → POST → Save

**Incoming SMS:**
- Same page → Messaging section → When a message comes in: `https://[DOMAIN]/api/webhooks/twilio/sms` → POST → Save

**Browser calling (TwiML App):**
- Develop → Voice → TwiML Apps → Create new TwiML App
- Friendly name: AdmitSimple
- Voice Request URL: `https://[DOMAIN]/api/webhooks/twilio/voice` → POST
- Save → copy the App SID (starts with AP)

Then tell me to add the App SID: edit `deploy/clients/main.tfvars` on GitHub, set `twilio_twiml_app_sid = "AP..."`, commit. CI/CD auto-redeploys.

---

## STEP 13 — FINAL VERIFICATION

Walk me through checking each of these. Do not mark complete until all pass:

- [ ] `https://[DOMAIN]` loads with green padlock
- [ ] Login: username `admin`, the password I set → lands on dashboard
- [ ] Settings → Facility → type a name → Save works
- [ ] Settings → AI Settings → Anthropic key → Save works
- [ ] New Inquiry → fill name + phone → Save → appears on Pipeline board
- [ ] AWS → CloudWatch → Log groups → `/ecs/admitsimple-main` → logs are streaming
- [ ] AWS → CloudTrail → Event history → events are recording
- [ ] Call the Twilio number → inbound call alert appears in app
- [ ] Text the Twilio number → message appears in SMS inbox

---

## HOW TO ADD NEW CLIENTS AFTER LAUNCH

For each new treatment center:
1. Create `deploy/clients/[CLIENT-SLUG].tfvars` on GitHub web UI — copy `main.tfvars`, change domain, passwords, Twilio number
2. Commit → GitHub Actions auto-deploys a fully isolated AWS stack (own VPC, own database, own ECS cluster)
3. Add their DNS CNAME record
4. Set up their Twilio webhooks
5. Give them their login URL and admin password
Total time per new client: ~15 minutes

## HOW TO SELL THE FULL APP (CLIENT OWNS THEIR AWS)

1. Client creates an AWS account and gives you a temporary IAM access key
2. `aws configure` with their key, run `deploy/scripts/new-client.sh`
3. Everything deploys into their account, billed to their card
4. They delete the temp key when done

## HOW TO PUSH APP UPDATES

Push to GitHub main branch → GitHub Actions handles everything → all clients updated in ~15 min, zero downtime.

---

Begin with Step 1. Collect credentials, then execute every step without stopping.
