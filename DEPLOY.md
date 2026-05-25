# Deployment guide — PMS Pool Villa

Production stack: **Docker Compose** = MySQL 8 + 2 Next.js apps + Caddy (auto HTTPS).

## Prerequisites on the server

- Docker + Docker Compose v2 (DigitalOcean 1-Click Docker droplet works)
- DNS A records for both subdomains pointing to the server's public IP
- Ports 80/443 open to the public internet (Caddy needs both for ACME challenge)

## First-time deploy

```bash
# 1. Clone
ssh root@<SERVER_IP>
cd /opt
git clone https://github.com/<your-username>/pms-poolvilla.git
cd pms-poolvilla

# 2. Configure env
cp .env.production.example .env
nano .env   # fill in domains + DB passwords + AUTH_SECRET (openssl rand -base64 32)

# 3. Build + start
docker compose up -d --build
docker compose logs -f caddy   # watch Let's Encrypt provision certs

# 4. Initialise the database (one time)
docker compose exec own pnpm --filter @pms/db prisma db push
docker compose exec own pnpm --filter @pms/db tsx prisma/seed.ts
```

## Updates

```bash
cd /opt/pms-poolvilla
git pull
docker compose up -d --build
# If schema changed:
docker compose exec own pnpm --filter @pms/db prisma db push
```

## Troubleshooting

- **`caddy` keeps restarting / 502**: check `docker compose logs caddy own m` — usually a wrong domain in `.env` or DNS not yet propagated.
- **Login fails / "AUTH_URL mismatch"**: re-check `AUTH_SECRET` and that `OWN_DOMAIN` / `ADMIN_DOMAIN` exactly match what users type in the browser.
- **DB connection errors on first start**: the app starts before MySQL is ready on the very first boot — `docker compose restart own m` after MySQL is healthy.
- **Image upload 413**: increase `request_body max_size` in `Caddyfile` and Next's `serverActions.bodySizeLimit` in `apps/*/next.config.ts`.

## Useful commands

```bash
docker compose ps                       # service status
docker compose logs -f own              # tail logs for the owner app
docker compose exec db mysql -uroot -p  # open MySQL shell
docker compose down                     # stop everything (keeps volumes)
docker compose down -v                  # ☠️ wipes DB too
```
