#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# AdmitSimple — New Client Deployment Script
# Usage: ./deploy/scripts/new-client.sh
# ─────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║     AdmitSimple — New Client Setup       ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# ── Collect client info ──────────────────────
read -p "Client short name (e.g. sunrise-recovery): " CLIENT_NAME
read -p "Domain (e.g. sunrise.admitsimple.com):     " DOMAIN
read -p "AWS region (default: us-east-1):           " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}
read -p "Admin password for this client:            " ADMIN_PASSWORD
read -p "Twilio Account SID (leave blank to skip):  " TWILIO_SID
read -p "Twilio Auth Token (leave blank to skip):   " TWILIO_TOKEN
read -p "Twilio Phone Number (e.g. +16025551234):   " TWILIO_PHONE

# ── Validate AWS CLI is configured ──────────
echo ""
echo "▶ Checking AWS credentials..."
aws sts get-caller-identity > /dev/null || { echo "❌ AWS CLI not configured. Run 'aws configure' first."; exit 1; }
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
echo "✅ AWS Account: $AWS_ACCOUNT"

# ── Create ECR repository if it doesn't exist ─
ECR_REPO="admitsimple"
echo ""
echo "▶ Setting up ECR repository..."
aws ecr describe-repositories --repository-names "$ECR_REPO" --region "$AWS_REGION" > /dev/null 2>&1 || \
  aws ecr create-repository --repository-name "$ECR_REPO" --region "$AWS_REGION" \
    --image-scanning-configuration scanOnPush=true \
    --encryption-configuration encryptionType=AES256 > /dev/null
ECR_URL="$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/$ECR_REPO"
echo "✅ ECR: $ECR_URL"

# ── Build & push Docker images ───────────────
echo ""
echo "▶ Building Docker images..."
cd "$(git rev-parse --show-toplevel)"
IMAGE_TAG=$(git rev-parse --short HEAD)

aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_URL"

docker build -f deploy/Dockerfile.api -t "$ECR_URL:api-$IMAGE_TAG" -t "$ECR_URL:api-latest" .
docker build -f deploy/Dockerfile.web -t "$ECR_URL:web-$IMAGE_TAG" -t "$ECR_URL:web-latest" .

docker push "$ECR_URL:api-$IMAGE_TAG"
docker push "$ECR_URL:api-latest"
docker push "$ECR_URL:web-$IMAGE_TAG"
docker push "$ECR_URL:web-latest"
echo "✅ Images pushed"

# ── Generate secrets ─────────────────────────
SESSION_SECRET=$(openssl rand -base64 48)
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc 'a-zA-Z0-9' | head -c 24)

# ── Write client tfvars ──────────────────────
VARS_FILE="deploy/clients/${CLIENT_NAME}.tfvars"
mkdir -p deploy/clients
cat > "$VARS_FILE" <<EOF
client_name          = "$CLIENT_NAME"
domain               = "$DOMAIN"
aws_region           = "$AWS_REGION"
admin_password       = "$ADMIN_PASSWORD"
session_secret       = "$SESSION_SECRET"
db_password          = "$DB_PASSWORD"
twilio_account_sid   = "$TWILIO_SID"
twilio_auth_token    = "$TWILIO_TOKEN"
twilio_phone_number  = "$TWILIO_PHONE"
ecr_repository_url   = "$ECR_URL"
image_tag            = "$IMAGE_TAG"
EOF
echo "✅ Config saved to $VARS_FILE"

# ── Create Terraform S3 state bucket if needed ─
STATE_BUCKET="admitsimple-terraform-state"
aws s3api head-bucket --bucket "$STATE_BUCKET" 2>/dev/null || \
  aws s3api create-bucket --bucket "$STATE_BUCKET" --region us-east-1 \
    --create-bucket-configuration LocationConstraint=us-east-1 > /dev/null
aws s3api put-bucket-versioning --bucket "$STATE_BUCKET" \
  --versioning-configuration Status=Enabled
aws s3api put-bucket-encryption --bucket "$STATE_BUCKET" \
  --server-side-encryption-configuration '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# ── Run Terraform ────────────────────────────
echo ""
echo "▶ Running Terraform..."
cd deploy/terraform
terraform init -reconfigure \
  -backend-config="bucket=$STATE_BUCKET" \
  -backend-config="key=clients/$CLIENT_NAME/terraform.tfstate" \
  -backend-config="region=us-east-1"

terraform apply -var-file="../../$VARS_FILE" -auto-approve

# ── Print summary ────────────────────────────
echo ""
echo "╔══════════════════════════════════════════╗"
echo "║           ✅ DEPLOYMENT COMPLETE          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Client:   $CLIENT_NAME"
echo "URL:      https://$DOMAIN"
echo ""
ALB_DNS=$(terraform output -raw alb_dns_name)
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "NEXT STEP — Add this DNS record:"
echo "  Type:  CNAME"
echo "  Name:  $DOMAIN"
echo "  Value: $ALB_DNS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Admin login:"
echo "  URL:      https://$DOMAIN"
echo "  Username: admin"
echo "  Password: $ADMIN_PASSWORD"
echo ""
