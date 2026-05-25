#!/usr/bin/env bash
# PMS Pool Villa — first-time server bootstrap.
#
# Run on a fresh DigitalOcean Docker droplet:
#   curl -fsSL https://raw.githubusercontent.com/USER/REPO/main/deploy/server-bootstrap.sh | bash
# Or copy-paste into an SSH session as root.
#
# Idempotent — safe to re-run if something fails partway through.

set -euo pipefail

# ─── Required environment ─────────────────────────────────────────────
# Override before running, e.g.:
#   REPO_URL=https://github.com/me/pms-poolvilla.git bash server-bootstrap.sh
: "${REPO_URL:?Set REPO_URL to your GitHub clone URL}"
: "${OWN_DOMAIN:=own.wonderland-cm.com}"
: "${ADMIN_DOMAIN:=admin.wonderland-cm.com}"
APP_DIR="${APP_DIR:-/opt/pms-poolvilla}"

log() { printf '\n\033[1;34m▶ %s\033[0m\n' "$*"; }
die() { printf '\n\033[1;31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# ─── 1. Verify Docker + Compose ───────────────────────────────────────
log "Checking Docker"
command -v docker >/dev/null || die "Docker not installed — use a DigitalOcean Docker droplet"
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 not available"

# ─── 2. Install git if needed ─────────────────────────────────────────
if ! command -v git >/dev/null; then
  log "Installing git"
  apt-get update -qq && apt-get install -y -qq git
fi

# ─── 3. Clone / update repo ───────────────────────────────────────────
if [[ -d "$APP_DIR/.git" ]]; then
  log "Repo exists — pulling latest"
  git -C "$APP_DIR" pull --ff-only
else
  log "Cloning repo to $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ─── 4. Generate .env on first run ────────────────────────────────────
if [[ ! -f .env ]]; then
  log "Generating .env (one-time)"
  AUTH_SECRET=$(openssl rand -base64 32)
  MYSQL_ROOT_PASSWORD=$(openssl rand -hex 24)
  MYSQL_PASSWORD=$(openssl rand -hex 24)
  cat > .env <<ENV
OWN_DOMAIN=${OWN_DOMAIN}
ADMIN_DOMAIN=${ADMIN_DOMAIN}

MYSQL_ROOT_PASSWORD=${MYSQL_ROOT_PASSWORD}
MYSQL_DATABASE=pms_poolvilla
MYSQL_USER=pms
MYSQL_PASSWORD=${MYSQL_PASSWORD}

AUTH_SECRET=${AUTH_SECRET}
ENV
  chmod 600 .env
  echo "  → wrote .env (mode 600). Back this file up — it contains your DB password!"
else
  log ".env already exists — leaving alone"
fi

# ─── 5. Build + start ─────────────────────────────────────────────────
log "Building images (5-10 min on first run)"
docker compose build

log "Starting services"
docker compose up -d

log "Waiting for MySQL to be healthy"
for i in {1..30}; do
  if docker compose ps db --format json 2>/dev/null | grep -q '"Health":"healthy"'; then
    echo "  → MySQL ready"
    break
  fi
  sleep 2
done

# ─── 6. Schema + seed ─────────────────────────────────────────────────
log "Pushing Prisma schema"
docker compose exec -T own pnpm --filter @pms/db prisma db push --accept-data-loss

if [[ "${SEED:-yes}" == "yes" ]]; then
  log "Seeding master data (set SEED=no to skip)"
  docker compose exec -T own pnpm --filter @pms/db tsx prisma/seed.ts || \
    echo "  ⚠ Seed failed or already done — continuing"
fi

# ─── 7. Status ────────────────────────────────────────────────────────
log "Done. Services:"
docker compose ps

cat <<DONE

✓ Deploy complete.

  Owner panel : https://${OWN_DOMAIN}
  Admin panel : https://${ADMIN_DOMAIN}

First request may take ~30s while Caddy provisions Let's Encrypt certs.
Tail logs:
  docker compose logs -f caddy own m
DONE
