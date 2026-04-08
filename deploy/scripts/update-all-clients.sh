#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────
# AdmitSimple — Push Update to All Clients
# Usage: ./deploy/scripts/update-all-clients.sh
# ─────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║    AdmitSimple — Update All Clients      ║"
echo "╚══════════════════════════════════════════╝"
echo ""

cd "$(git rev-parse --show-toplevel)"

IMAGE_TAG=$(git rev-parse --short HEAD)
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCOUNT=$(aws sts get-caller-identity --query Account --output text)
ECR_URL="$AWS_ACCOUNT.dkr.ecr.$AWS_REGION.amazonaws.com/admitsimple"

# ── Build & push new images ──────────────────
echo "▶ Building Docker images (tag: $IMAGE_TAG)..."
aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$ECR_URL"

docker build -f deploy/Dockerfile.api -t "$ECR_URL:api-$IMAGE_TAG" -t "$ECR_URL:api-latest" .
docker build -f deploy/Dockerfile.web -t "$ECR_URL:web-$IMAGE_TAG" -t "$ECR_URL:web-latest" .

docker push "$ECR_URL:api-$IMAGE_TAG"
docker push "$ECR_URL:api-latest"
docker push "$ECR_URL:web-$IMAGE_TAG"
docker push "$ECR_URL:web-latest"
echo "✅ Images pushed"

# ── Update each client ───────────────────────
CLIENTS_DIR="deploy/clients"
if [ ! -d "$CLIENTS_DIR" ] || [ -z "$(ls "$CLIENTS_DIR"/*.tfvars 2>/dev/null)" ]; then
  echo "No client configs found in $CLIENTS_DIR"
  exit 0
fi

UPDATED=0
FAILED=0

for VARS_FILE in "$CLIENTS_DIR"/*.tfvars; do
  CLIENT_NAME=$(basename "$VARS_FILE" .tfvars)
  echo ""
  echo "▶ Updating $CLIENT_NAME..."

  cd deploy/terraform
  terraform init -reconfigure \
    -backend-config="bucket=admitsimple-terraform-state" \
    -backend-config="key=clients/$CLIENT_NAME/terraform.tfstate" \
    -backend-config="region=us-east-1" > /dev/null 2>&1

  if terraform apply \
    -var-file="../../$VARS_FILE" \
    -var="image_tag=$IMAGE_TAG" \
    -auto-approve > /tmp/tf-$CLIENT_NAME.log 2>&1; then

    # Force ECS to pull the new image
    CLUSTER="admitsimple-${CLIENT_NAME}-cluster"
    SERVICE="admitsimple-${CLIENT_NAME}-service"
    aws ecs update-service \
      --cluster "$CLUSTER" \
      --service "$SERVICE" \
      --force-new-deployment \
      --region "$AWS_REGION" > /dev/null 2>&1 || true

    echo "  ✅ $CLIENT_NAME updated"
    UPDATED=$((UPDATED + 1))
  else
    echo "  ❌ $CLIENT_NAME FAILED — see /tmp/tf-$CLIENT_NAME.log"
    FAILED=$((FAILED + 1))
  fi

  cd "$(git rev-parse --show-toplevel)"
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Done. Updated: $UPDATED  Failed: $FAILED"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
