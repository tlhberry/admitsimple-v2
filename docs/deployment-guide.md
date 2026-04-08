# AdmitSimple — AWS Deployment Guide
## Replacing the Old EC2 Instance With the New Version

---

## Prerequisites — What You Need Before Starting

1. **AWS CLI installed** on your local machine
   - Mac: `brew install awscli`
   - Windows: Download from https://aws.amazon.com/cli/
   - Verify: `aws --version`

2. **Docker Desktop installed** on your local machine
   - Download from https://www.docker.com/products/docker-desktop/
   - Must be running in the background

3. **Terraform installed** on your local machine
   - Mac: `brew tap hashicorp/tap && brew install hashicorp/tap/terraform`
   - Windows: https://developer.hashicorp.com/terraform/install
   - Verify: `terraform --version`

4. **AWS credentials configured**
   - Run: `aws configure`
   - Enter your AWS Access Key ID, Secret Access Key, and region (`us-east-1` recommended)

5. **This codebase cloned to your local machine**
   - `git clone <your-repo-url>`
   - `cd admitsimple`

6. **Your domain ready** — e.g. `app.yourfacilityname.com` or `admitsimple.yourfacilityname.com`

---

## Step 1 — Stop (or Terminate) the Old EC2 Instance

1. Log in to https://console.aws.amazon.com
2. Go to **EC2 → Instances**
3. Find the instance named "Admissions CRM" (id: i-0d0ef6e34932c7b49)
4. Select it → **Instance State** → **Stop** (or **Terminate** if you're done with it)

> If there's an Elastic IP attached to it, note the IP — you may want to release it to avoid charges.

---

## Step 2 — Run the Deployment Script

From the root of your cloned project folder, run:

```bash
./deploy/scripts/new-client.sh
```

The script will ask you a series of questions. Here's what to enter for each:

| Prompt | What to Enter | Example |
|---|---|---|
| Client short name | A short ID (lowercase, dashes only) | `sunrise-recovery` |
| Domain | The URL clients will use | `app.sunriserecovery.com` |
| AWS region | Where to deploy (match your old instance) | `us-east-1` |
| Admin password | A strong password for the admin login | `Sunrise2024!` |
| Twilio Account SID | From your Twilio console | `ACxxxxxxxxxxxxx` |
| Twilio Auth Token | From your Twilio console | `your_auth_token` |
| Twilio Phone Number | Your Twilio number with country code | `+16025551234` |

The script will then automatically:
- Build Docker images of the app
- Push them to AWS ECR (a private container registry)
- Run Terraform to create all the AWS infrastructure:
  - Load balancer (ALB)
  - App servers (ECS)
  - Database (RDS PostgreSQL, encrypted)
  - SSL certificate (ACM)
  - VPC, security groups, IAM roles
- Run the database migrations
- Print the admin login URL and credentials

**This takes about 10–15 minutes.**

---

## Step 3 — Point Your Domain at the New Server

When the script finishes, it will print something like:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NEXT STEP — Add this DNS record:
  Type:  CNAME
  Name:  app.sunriserecovery.com
  Value: admitsimple-xyz123.us-east-1.elb.amazonaws.com
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Go to wherever your domain's DNS is managed (GoDaddy, Cloudflare, Route 53, etc.) and add that CNAME record.

DNS changes can take 5–60 minutes to propagate. Once it's live, visit `https://your-domain.com` and you should see the AdmitSimple login page.

---

## Step 4 — Log In and Configure

1. Go to `https://your-domain.com`
2. Log in with:
   - Username: `admin`
   - Password: whatever you set in the script
3. Go to **Settings → AI Settings** and enter your Anthropic API key
4. Go to **Settings → Facility** and fill in your facility information
5. Set up your team under **Settings → Users** (if applicable)

---

## Step 5 — Twilio Webhook Configuration

After deployment, update your Twilio webhooks to point to the new URL:

1. Log in to https://console.twilio.com
2. Go to **Phone Numbers → Manage → Active Numbers**
3. Click your phone number
4. Under **Voice & Fax**, set:
   - **A call comes in:** `https://your-domain.com/api/webhooks/twilio/inbound-call` (HTTP POST)
5. Under **Messaging**, set:
   - **A message comes in:** `https://your-domain.com/api/webhooks/twilio/sms` (HTTP POST)
6. Save

---

## Updating the App in the Future

When you want to push a new version:

```bash
./deploy/scripts/update-all-clients.sh
```

This rebuilds the Docker images, pushes them to ECR, and does a zero-downtime rolling update for all your deployed clients.

---

## Troubleshooting

| Issue | Fix |
|---|---|
| `aws: command not found` | Install AWS CLI and run `aws configure` |
| `docker: command not found` | Install and start Docker Desktop |
| `terraform: command not found` | Install Terraform |
| Terraform fails on first run | Make sure your IAM user has AdministratorAccess or the right permissions |
| Site loads but shows error | Check ECS task logs in AWS Console → ECS → Clusters → your cluster → Tasks |
| Domain not resolving | Wait up to 60 min for DNS, verify CNAME is set correctly |

---

## AWS Costs (Estimated)

For a single client deployment:

| Service | Est. Monthly Cost |
|---|---|
| ECS Fargate (2 tasks) | ~$30–50 |
| RDS PostgreSQL (db.t3.micro) | ~$15–25 |
| ALB | ~$20 |
| ACM Certificate | Free |
| ECR (image storage) | ~$1–5 |
| Data transfer | ~$5–15 |
| **Total** | **~$70–115/month** |

Costs scale with traffic. For multiple clients, each gets its own isolated stack at this same cost.
