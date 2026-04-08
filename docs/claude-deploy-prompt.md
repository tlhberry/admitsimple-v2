# PASTE THIS ENTIRE PROMPT INTO CLAUDE
# Claude needs access to: GitHub account, AWS console

---

You are deploying a production web application called **AdmitSimple** to AWS. Work through every step below in order without stopping. Do not ask unnecessary questions — only ask me for credentials or values you cannot generate yourself.

---

## IMPORTANT CONTEXT — READ FIRST

The code for this app lives inside a **Replit project**, not on GitHub yet. Replit has a built-in GitHub connect feature. Your first job is to push the code from Replit to a new GitHub repository, then proceed with the full AWS deployment. The app already has all the infrastructure code written and ready — Terraform, Dockerfiles, GitHub Actions CI/CD, deployment scripts. You do not need to write any infrastructure code.

---

## STEP 1 — ASK ME FOR THESE THINGS BEFORE STARTING

Ask me for all of these up front, then proceed without interrupting me again:

1. **Replit GitHub connection** — I will connect Replit to GitHub myself following your instructions below. Tell me to do it now.
2. **New GitHub repo name** — suggest `admitsimple` (private repo)
3. **AWS credentials** — I'll need to create an IAM user. Walk me through it.
4. **Domain name** — the URL the app will run at (e.g. `app.admitsimple.com`)
5. **Admin password** — what I want the admin login password to be
6. **Anthropic API key** — for AI features (can be added in app Settings after launch if I don't have it ready)
7. **Twilio credentials** — Account SID, Auth Token, Phone Number (can skip for now and add later)

---

## STEP 2 — PUSH REPLIT CODE TO GITHUB

Tell me to do the following inside Replit right now (I will do it while you wait):

1. In Replit, click the **Git icon** in the left sidebar
2. Click **"Connect to GitHub"** and authorize Replit to access my GitHub account
3. Create a **new private repository** named `admitsimple`
4. Click **"Push"** — Replit will push all the code to GitHub automatically
5. Tell me to confirm when it's done, then paste the GitHub repo URL

Once I give you the repo URL, verify the following files exist in it before continuing. If any are missing, stop and tell me:
- `deploy/Dockerfile.api`
- `deploy/Dockerfile.web`
- `deploy/terraform/main.tf`
- `deploy/terraform/variables.tf`
- `deploy/terraform/outputs.tf`
- `deploy/scripts/new-client.sh`
- `deploy/scripts/update-all-clients.sh`
- `.github/workflows/deploy.yml`
- `deploy/nginx.conf`
- `deploy/docker-compose.yml`

---

## STEP 3 — CREATE IAM DEPLOY USER IN AWS

Walk me through this in the AWS console:

1. Go to **IAM → Users → Create user**
2. Username: `admitsimple-deploy`
3. Do NOT enable console access
4. Attach policy: **AdministratorAccess**
5. After creating: go to **Security credentials → Create access key**
6. Select **"Application running outside AWS"**
7. Save both the **Access Key ID** and **Secret Access Key** — paste them to you

---

## STEP 4 — CREATE ECR REPOSITORY

Walk me through this in the AWS console:

1. Go to **ECR → Repositories → Create repository**
2. Visibility: **Private**
3. Name: `admitsimple`
4. Enable **Scan on push**
5. Encryption: **AES-256**
6. Create it and copy the full **repository URI**
   (looks like: `123456789.dkr.ecr.us-east-1.amazonaws.com/admitsimple`)

---

## STEP 5 — CREATE TERRAFORM STATE BUCKET IN S3

Walk me through this in the AWS console:

1. Go to **S3 → Create bucket**
2. Name: `admitsimple-terraform-state`
3. Region: `us-east-1`
4. Block all public access: **ON**
5. Versioning: **Enable**
6. Server-side encryption: **Enable (SSE-S3)**
7. Create it

---

## STEP 6 — ADD GITHUB SECRETS

Walk me through this on GitHub:

1. Go to the `admitsimple` repo → **Settings → Secrets and variables → Actions**
2. Click **New repository secret** and add these two:

| Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | The access key from Step 3 |
| `AWS_SECRET_ACCESS_KEY` | The secret key from Step 3 |

---

## STEP 7 — CREATE THE CLIENT CONFIG FILE

In the GitHub repo, create a new file at this exact path:
`deploy/clients/MY-CLIENT-NAME.tfvars`

Replace `MY-CLIENT-NAME` with a short lowercase slug (e.g. `main` or `sunrise-recovery` — under 20 chars, lowercase, dashes only).

Use this exact format and fill in every value:

```hcl
client_name          = "MY-CLIENT-NAME"
domain               = "DOMAIN-I-PROVIDED"
aws_region           = "us-east-1"
admin_password       = "ADMIN-PASSWORD-I-PROVIDED"
session_secret       = "GENERATE: run [openssl rand -base64 48] and paste result"
db_password          = "GENERATE: run [openssl rand -base64 24 | tr -dc a-zA-Z0-9 | head -c 20] and paste result"
twilio_account_sid   = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
twilio_auth_token    = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
twilio_phone_number  = "+16025551234"
twilio_twiml_app_sid = ""
anthropic_base_url   = "https://api.anthropic.com"
anthropic_api_key    = "sk-ant-xxxxxxxxxx"
ecr_repository_url   = "ECR-URI-FROM-STEP-4"
image_tag            = "latest"
```

Generate the two random secrets using any terminal or online tool:
- **session_secret**: `openssl rand -base64 48`
- **db_password**: `openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20`

Commit this file directly on GitHub (Edit → Commit changes).

**Note:** The `deploy/clients/` folder is in `.gitignore`. To commit it anyway, use GitHub's web UI to create the file directly — the web UI bypasses `.gitignore`.

---

## STEP 8 — TRIGGER THE DEPLOYMENT

Once the `deploy/clients/MY-CLIENT-NAME.tfvars` file is committed:

1. Go to the GitHub repo → **Actions** tab
2. You should see the **"Build & Deploy AdmitSimple"** workflow starting automatically
3. Watch it run — it has two jobs:
   - **Build Docker Images** (~5 min) — builds and pushes containers to ECR
   - **Deploy to Clients** (~10 min) — runs Terraform, creates all AWS infrastructure, starts the app

4. Wait for both jobs to show green checkmarks
5. If anything fails, paste the error output to me

---

## STEP 9 — GET THE ALB DNS NAME

After the workflow succeeds:

1. Go to **AWS → EC2 → Load Balancers**
2. Find the load balancer named `admitsimple-MY-CLIENT-NAME-alb`
3. Copy its **DNS name** (looks like `admitsimple-abc123.us-east-1.elb.amazonaws.com`)
4. Also go to **AWS → ACM (Certificate Manager)** and check the certificate for the domain
5. If it shows **Pending validation**, copy the CNAME record shown — we need to add it to DNS

---

## STEP 10 — CONFIGURE DNS

At the domain registrar (GoDaddy, Cloudflare, Route 53, Namecheap, etc.) — walk me through adding:

**Record 1 — points domain to the app:**
- Type: `CNAME`
- Name: the subdomain part only (e.g. `app` if domain is `app.admitsimple.com`, or `@` for root)
- Value: the ALB DNS name from Step 9
- TTL: 300

**Record 2 — SSL certificate validation (if ACM showed Pending):**
- Type: `CNAME`
- Name: the long `_abc123.yourdomain.com` string ACM gave
- Value: the `_xyz.acm-validations.aws` string ACM gave
- TTL: 300

After adding records, check propagation every 5 minutes:
```
nslookup YOURDOMAIN
```
DNS + SSL validation can take 5–30 minutes. Continue to next steps while waiting.

---

## STEP 11 — TERMINATE THE OLD EC2 INSTANCE

In the AWS console:
1. Go to **EC2 → Instances**
2. Find the instance named **"Admissions CRM"** (instance ID: `i-0d0ef6e34932c7b49`)
3. Select it → **Instance State → Terminate instance**
4. Go to **EC2 → Elastic IPs** — if one is not associated with anything, release it to stop charges

---

## STEP 12 — CONFIGURE TWILIO WEBHOOKS

In the Twilio console (console.twilio.com):

**Set incoming call webhook:**
1. Phone Numbers → Manage → Active Numbers → click the number
2. Voice & Fax section:
   - "When a call comes in": `https://YOURDOMAIN/api/webhooks/twilio/inbound-call`
   - Method: POST
3. Save

**Set incoming SMS webhook:**
1. Same phone number page → Messaging section
   - "When a message comes in": `https://YOURDOMAIN/api/webhooks/twilio/sms`
   - Method: POST
2. Save

**Create TwiML App for browser calling:**
1. Develop → Voice → TwiML Apps → Create new TwiML App
2. Friendly name: `AdmitSimple`
3. Voice Request URL: `https://YOURDOMAIN/api/webhooks/twilio/voice`
4. Method: POST
5. Save and copy the **App SID** (starts with `AP`)

**Add TwiML App SID to the deployment:**
1. On GitHub, edit `deploy/clients/MY-CLIENT-NAME.tfvars`
2. Set `twilio_twiml_app_sid = "APxxxxxxxxxxxxxxxxxx"`
3. Commit — GitHub Actions will auto-redeploy with the new value

---

## STEP 13 — VERIFY EVERYTHING IS WORKING

Run through this checklist. Confirm each item out loud to me:

- [ ] `https://YOURDOMAIN` loads the login page with a green padlock (valid SSL)
- [ ] Login with username `admin` and the password I set works
- [ ] Dashboard loads with no errors
- [ ] **Settings → Facility** — enter facility name and save successfully
- [ ] **Settings → AI Settings** — enter Anthropic API key and save
- [ ] Create a test inquiry — "New Inquiry" button, fill in a name and phone number, save
- [ ] The new inquiry appears on the Pipeline / Kanban board
- [ ] AWS → CloudWatch → Log groups → `/ecs/admitsimple-MY-CLIENT-NAME` — logs are flowing
- [ ] AWS → CloudTrail → Event history — events are being recorded (HIPAA audit log)
- [ ] Call the Twilio phone number — the inbound call alert appears in the app
- [ ] Send an SMS to the Twilio number — it appears in the SMS inbox

---

## AFTER LAUNCH — ONGOING USAGE

**Pushing app updates:**
All future updates are automatic. Any time code changes are pushed to the `main` branch on GitHub, the CI/CD pipeline rebuilds and redeploys everything. Zero downtime, all clients updated within ~15 minutes.

**Adding a new client (SaaS multi-tenant model):**
1. Create `deploy/clients/NEW-CLIENT.tfvars` with their details on GitHub (web UI)
2. Commit it — GitHub Actions deploys a completely isolated AWS stack for them automatically
3. Add their CNAME DNS record pointing to their new ALB
4. Set up Twilio webhooks for their phone number
5. Done — ~15 minutes total per new client

**Selling the app outright (perpetual license — client owns their AWS):**
1. Client creates their own AWS account
2. They create an IAM user and give you the access key temporarily
3. Run `new-client.sh` configured with their credentials — everything deploys into their account
4. They delete the temporary IAM key when done
5. Their app runs entirely on their own AWS, billed to their card
6. To push future updates to them: they give you temp credentials again, run `update-all-clients.sh`

---

Begin now with Step 1. Ask me for everything you need, then do not stop until Step 13 is fully complete and checked off.
