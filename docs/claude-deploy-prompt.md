# PASTE THIS ENTIRE FILE INTO CLAUDE
# Give Claude access to: GitHub repo, AWS console, EC2 terminal

---

You are deploying a production web application called **AdmitSimple** to AWS. You have access to the GitHub repository, the AWS console, and an EC2 terminal. Work through every step below in order. Do not stop until the app is fully live, HTTPS is working, and I can log in. Ask me for any credentials you need but otherwise work autonomously.

---

## THE APPLICATION

AdmitSimple is a HIPAA-compliant Admissions CRM for addiction treatment centers. It has two Docker containers:
- **API server** — Node.js / Express on port 3001
- **Web frontend** — React/Vite built to static files, served by nginx on port 80

The GitHub repository already contains everything needed to deploy. All infrastructure code is in the `deploy/` folder. Do not create any new infrastructure code — use what is already there.

---

## WHAT IS ALREADY IN THE REPO — READ THIS CAREFULLY

```
deploy/
  Dockerfile.api                 ← builds the Express API container
  Dockerfile.web                 ← builds the React frontend container
  docker-compose.yml             ← local/simple testing only
  nginx.conf                     ← hardened reverse proxy config
  scripts/
    new-client.sh                ← one-command script to deploy a new client to AWS
    update-all-clients.sh        ← push updates to all deployed clients
  terraform/
    main.tf                      ← full HIPAA AWS infrastructure (VPC, ECS, RDS, ALB, ACM, CloudTrail)
    variables.tf                 ← all input variables
    outputs.tf                   ← ALB DNS, DB endpoint, SSL cert validation records
  clients/                       ← (gitignored) one .tfvars file per client lives here

.github/workflows/deploy.yml     ← GitHub Actions CI/CD — already written, just needs secrets
```

The GitHub Actions workflow at `.github/workflows/deploy.yml` already exists and does this on every push to `main`:
1. Builds both Docker images
2. Tags them with the git SHA and `latest`
3. Pushes them to ECR
4. Runs Terraform for every `.tfvars` file in `deploy/clients/`
5. Calls `aws ecs update-service --force-new-deployment` per client

---

## CREDENTIALS YOU NEED FROM ME BEFORE STARTING

Ask me for these one time at the beginning, then proceed:

1. **AWS Account** — do you have full AWS console access? (I'll say yes/no)
2. **GitHub repo URL** — where is the code?
3. **Domain name** — what URL should the app run at? (e.g. `app.admitsimple.com` or `app.yourfacility.com`)
4. **Admin password** — what password do you want for the admin login?
5. **Anthropic API key** — for AI features (or I can add it in Settings after launch)
6. **Twilio credentials** — Account SID, Auth Token, and phone number (or skip for now)

---

## STEP 1 — TERMINATE THE OLD EC2 INSTANCE

In the AWS console:
1. Go to **EC2 → Instances**
2. Find the instance named **"Admissions CRM"** (instance ID: `i-0d0ef6e34932c7b49`)
3. Select it → **Instance State → Terminate**
4. If it has an Elastic IP attached, go to **EC2 → Elastic IPs** and release it to stop charges
5. Confirm the instance is terminated before moving on

---

## STEP 2 — CREATE A DEPLOYMENT IAM USER IN AWS

In the AWS console:
1. Go to **IAM → Users → Create user**
2. Username: `admitsimple-deploy`
3. Do NOT enable console access — this is a programmatic user only
4. Attach policy: **AdministratorAccess** (we can scope this down later)
5. After creating the user, go to **Security credentials → Create access key**
6. Choose **"Application running outside AWS"**
7. Save the **Access Key ID** and **Secret Access Key** — you will need these in Step 3 and Step 4

---

## STEP 3 — CREATE THE ECR REPOSITORY

In the AWS console:
1. Go to **ECR (Elastic Container Registry) → Repositories → Create repository**
2. Visibility: **Private**
3. Repository name: `admitsimple`
4. Enable **"Scan on push"**
5. Encryption: **AES-256**
6. Create it
7. Copy the full repository URI — it looks like: `123456789.dkr.ecr.us-east-1.amazonaws.com/admitsimple`

---

## STEP 4 — ADD GITHUB SECRETS

In the GitHub repository:
1. Go to **Settings → Secrets and variables → Actions → New repository secret**
2. Add these secrets one by one:

| Secret Name | Value |
|---|---|
| `AWS_ACCESS_KEY_ID` | The access key ID from Step 2 |
| `AWS_SECRET_ACCESS_KEY` | The secret access key from Step 2 |

That is all GitHub needs. The workflow file already reads these.

---

## STEP 5 — CREATE THE TERRAFORM STATE S3 BUCKET

The Terraform backend stores its state in S3. Create the bucket manually before running Terraform.

In the AWS console:
1. Go to **S3 → Create bucket**
2. Bucket name: `admitsimple-terraform-state`
3. Region: `us-east-1`
4. **Block all public access**: ON
5. **Versioning**: Enable
6. **Server-side encryption**: Enable with Amazon S3 managed keys (SSE-S3)
7. Create it

---

## STEP 6 — CREATE THE CLIENT CONFIG FILE AND RUN TERRAFORM

In the GitHub repository, create this file at exactly this path:
`deploy/clients/MY-CLIENT-NAME.tfvars`

Replace `MY-CLIENT-NAME` with a short lowercase slug like `sunrise-recovery` or `my-facility`. This name is used in all AWS resource names so keep it short (under 20 chars, lowercase, dashes only).

File contents — fill in every value:

```hcl
client_name          = "MY-CLIENT-NAME"
domain               = "THE-DOMAIN-I-GAVE-YOU"
aws_region           = "us-east-1"
admin_password       = "THE-ADMIN-PASSWORD-I-GAVE-YOU"
session_secret       = "GENERATE-THIS-RUN: openssl rand -base64 48"
db_password          = "GENERATE-THIS-RUN: openssl rand -base64 24 | tr -dc a-zA-Z0-9 | head -c20"
twilio_account_sid   = "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
twilio_auth_token    = "the-twilio-auth-token"
twilio_phone_number  = "+16025551234"
twilio_twiml_app_sid = ""
anthropic_base_url   = "https://api.anthropic.com"
anthropic_api_key    = "sk-ant-xxxxxxxxxx"
ecr_repository_url   = "THE-ECR-URI-FROM-STEP-3"
image_tag            = "latest"
```

**To generate the random secrets**, use the EC2 terminal or any terminal:
```bash
# session_secret:
openssl rand -base64 48

# db_password:
openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 20
```

After creating the file, commit and push it to the `main` branch:
```bash
git add deploy/clients/MY-CLIENT-NAME.tfvars
git commit -m "add client: MY-CLIENT-NAME"
git push origin main
```

**IMPORTANT**: The `deploy/clients/` folder is in `.gitignore`. You need to force-add the file:
```bash
git add -f deploy/clients/MY-CLIENT-NAME.tfvars
git commit -m "add client: MY-CLIENT-NAME"
git push origin main
```

Now go to **GitHub → Actions** and watch the workflow run. It will:
- Build both Docker images and push to ECR (~5 min)
- Run Terraform to create all AWS infrastructure (~10 min)
- Deploy the ECS service (~3 min)

Wait for it to complete. If it fails, show me the error output.

---

## STEP 7 — NOTE THE OUTPUTS FROM TERRAFORM

After the GitHub Actions workflow completes, in the AWS console:
1. Go to **ECS → Clusters** → find `admitsimple-MY-CLIENT-NAME-cluster`
2. Confirm the service is running and tasks show status **RUNNING**

Then get the ALB DNS name:
1. Go to **EC2 → Load Balancers**
2. Find the one named `admitsimple-MY-CLIENT-NAME-alb`
3. Copy its **DNS name** — it looks like `admitsimple-xyz123.us-east-1.elb.amazonaws.com`

Also get the SSL certificate validation records:
1. Go to **ACM (Certificate Manager)**
2. Find the certificate for your domain
3. If status is **Pending validation**, copy the CNAME record shown under "Domains"

---

## STEP 8 — SET UP DNS

At the domain registrar (wherever the domain's DNS is managed — GoDaddy, Cloudflare, Route 53, Namecheap, etc.):

**Add CNAME record:**
- Name/Host: the subdomain part (e.g. `app` if the full domain is `app.admitsimple.com`)
- Type: CNAME
- Value: the ALB DNS name from Step 7
- TTL: 300 (5 min)

**If ACM needs validation, add the validation CNAME too:**
- Name: the long string ACM gave you (e.g. `_abc123.app.admitsimple.com`)
- Type: CNAME
- Value: the validation target ACM gave you

Wait 5–30 minutes for DNS to propagate. You can check progress with:
```bash
nslookup YOUR-DOMAIN
# or
dig YOUR-DOMAIN CNAME
```

The ACM certificate auto-validates once it sees the DNS record. This can take up to 30 min.

---

## STEP 9 — RUN DATABASE MIGRATIONS

The database tables need to be created. Do this via ECS Exec once the tasks are running:

In the AWS console:
1. Go to **ECS → Clusters → admitsimple-MY-CLIENT-NAME-cluster**
2. Go to **Tasks** → click the running task
3. Click **Execute command** (or use the AWS CLI below)

Using AWS CLI from the EC2 terminal or your terminal:
```bash
# Get the task ARN
TASK_ARN=$(aws ecs list-tasks \
  --cluster admitsimple-MY-CLIENT-NAME-cluster \
  --service-name admitsimple-MY-CLIENT-NAME-service \
  --query 'taskArns[0]' \
  --output text \
  --region us-east-1)

# Run migrations via ECS Exec into the API container
aws ecs execute-command \
  --cluster admitsimple-MY-CLIENT-NAME-cluster \
  --task $TASK_ARN \
  --container api \
  --interactive \
  --command "node -e \"require('./dist/migrate.mjs')\"" \
  --region us-east-1
```

**If ECS Exec isn't enabled**, the app auto-runs migrations on startup via Drizzle push. Check the CloudWatch logs to confirm:
1. Go to **CloudWatch → Log groups → /ecs/admitsimple-MY-CLIENT-NAME**
2. Look for log lines containing `Database ready` or `Migrations complete`

---

## STEP 10 — VERIFY THE APP IS LIVE

1. Open a browser and go to `https://YOUR-DOMAIN`
2. You should see the AdmitSimple login page
3. Log in with:
   - Username: `admin`
   - Password: the admin password from the tfvars file
4. You should land on the dashboard

If you see a security warning about the SSL certificate, wait another 10–15 min for ACM validation to complete, then try again.

---

## STEP 11 — CONFIGURE TWILIO WEBHOOKS

In the Twilio console (https://console.twilio.com):

**For the phone number:**
1. Go to **Phone Numbers → Manage → Active Numbers**
2. Click the phone number
3. Under **Voice & Fax**, set:
   - When a call comes in: `https://YOUR-DOMAIN/api/webhooks/twilio/inbound-call`
   - HTTP method: POST
4. Under **Messaging**, set:
   - When a message comes in: `https://YOUR-DOMAIN/api/webhooks/twilio/sms`
   - HTTP method: POST
5. Save

**Create a TwiML App for browser-based calling:**
1. Go to **Develop → Voice → TwiML Apps → Create new TwiML App**
2. Friendly name: `AdmitSimple - MY-CLIENT-NAME`
3. Voice Request URL: `https://YOUR-DOMAIN/api/webhooks/twilio/voice`
4. Voice Method: POST
5. Save and copy the **App SID** (starts with `AP`)

**Add the TwiML App SID to the deployment:**
1. Edit `deploy/clients/MY-CLIENT-NAME.tfvars`
2. Set `twilio_twiml_app_sid = "APxxxxxxxxxxxxxxxxxx"`
3. Push to GitHub — the CI/CD pipeline will update the ECS task automatically

---

## STEP 12 — FINAL VERIFICATION CHECKLIST

Run through each of these and confirm they work:

- [ ] `https://YOUR-DOMAIN` loads the login page with a valid SSL certificate (padlock icon)
- [ ] Login with admin / your-password works and lands on dashboard
- [ ] Go to **Settings → Facility** — fill in the facility name and save
- [ ] Go to **Settings → AI Settings** — enter the Anthropic API key and save
- [ ] Create a test inquiry — click "New Inquiry", fill in name and phone, save
- [ ] The inquiry appears on the Kanban pipeline board
- [ ] Call the Twilio phone number — it should ring and the inbound call appears in the app
- [ ] Send an SMS to the Twilio number — it should appear in the SMS inbox
- [ ] Go to **AWS → CloudWatch → Log groups** — confirm logs are flowing for the ECS tasks
- [ ] Go to **AWS → CloudTrail → Event history** — confirm audit logs are recording

---

## ADDING A NEW CLIENT FAST (Multi-Tenant SaaS)

Once the first deployment is working, adding a new treatment center client takes about 15 minutes:

1. Collect: their desired domain/subdomain, admin password, and Twilio credentials
2. Create `deploy/clients/NEW-CLIENT-NAME.tfvars` with their values (copy the first one and change the fields)
3. Force-add and push: `git add -f deploy/clients/NEW-CLIENT-NAME.tfvars && git commit -m "add client: NEW-CLIENT-NAME" && git push`
4. GitHub Actions auto-deploys everything
5. Add their CNAME DNS record pointing to their new ALB DNS
6. Configure Twilio webhooks for their number
7. Send them their login URL and credentials

Each client gets a completely isolated AWS stack — their own VPC, their own RDS database, their own ECS cluster. No client can see another client's data.

---

## SELLING THE APP (Perpetual License — Client Owns Their AWS)

For clients who buy the app outright and want it on their own AWS account:

1. Have the client create an AWS account at aws.amazon.com (free)
2. Have them create an IAM user with AdministratorAccess and give you the access key + secret key temporarily
3. On your terminal, run: `aws configure` and enter their credentials
4. Run the same `new-client.sh` script — it deploys to their account instead of yours
5. When complete, have them delete the temporary IAM key from their account
6. Their app runs entirely on their AWS, billed to their credit card
7. To push updates to them later, they give you temporary credentials and you run `update-all-clients.sh`

---

## PUSHING APP UPDATES TO ALL CLIENTS

Whenever you make code changes:

```bash
git add .
git commit -m "describe your changes"
git push origin main
```

GitHub Actions automatically:
1. Builds new Docker images
2. Pushes to ECR
3. Runs Terraform for every client in `deploy/clients/`
4. Forces ECS rolling updates (zero downtime)

All clients get the update within ~15 minutes of pushing.

---

## TROUBLESHOOTING

**App not loading / 502 Bad Gateway:**
- Check ECS task logs in CloudWatch: `/ecs/admitsimple-MY-CLIENT-NAME`
- Make sure the ECS task is in RUNNING state (not STOPPED)
- Common cause: wrong DATABASE_URL in the task environment (check Secrets Manager)

**SSL certificate stuck on "Pending validation":**
- Confirm the ACM CNAME validation record is in DNS
- Run `dig _VALIDATION-RECORD.YOUR-DOMAIN CNAME` — it should return the validation value
- Wait up to 30 min after adding the record

**Login works but AI features don't work:**
- Go to Settings → AI Settings and confirm the Anthropic API key is saved
- Check API server logs for Anthropic API errors

**Calls not coming through:**
- Verify Twilio webhook URL is exactly `https://YOUR-DOMAIN/api/webhooks/twilio/inbound-call`
- Check that the Twilio phone number's webhook is set to POST (not GET)
- Check API logs for webhook errors

**GitHub Actions fails on Terraform:**
- Make sure the S3 state bucket `admitsimple-terraform-state` exists in us-east-1
- Make sure the ECR repo `admitsimple` exists in us-east-1
- Make sure `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` are set in GitHub secrets

---

Begin now. Ask me for credentials first, then work through Steps 1–12 without stopping.
