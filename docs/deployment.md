# Deployment Guide

## Prerequisites

- Docker & Docker Compose v2+
- Git
- A domain with DNS A record pointing to your server
- SSH access to the server

## Initial Server Setup

### 1. Clone the repository

```bash
sudo mkdir -p /opt/catto
sudo chown $USER:$USER /opt/catto
git clone git@github.com:your-org/catto.git /opt/catto
cd /opt/catto
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your secrets (DISCORD_TOKEN, DATABASE_URL, etc.)
```

### 3. Configure Caddy domain

Set your domain and ACME email in `.env` or export them:

```bash
# Add to .env or export before running docker compose
CADDY_DOMAIN=api.yourdomain.com
CADDY_ACME_EMAIL=your@email.com
```

Caddy auto-provisions Let's Encrypt SSL certificates.

### 4. Start services

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### 5. Run initial database migration

```bash
docker compose exec bot pnpm prisma migrate deploy
```

### 6. Verify

```bash
curl https://api.yourdomain.com/api/health
```

You should see:
```json
{
  "status": "ok",
  "version": "dev",
  "guilds": 0,
  "gateway": 0,
  "redis": "connected",
  "postgres": "connected"
}
```

## Automated Deploys (GitHub Actions)

The CD pipeline auto-deploys on push to `main` after CI passes.

### Required GitHub Secrets

| Secret | Description |
|--------|-------------|
| `SERVER_HOST` | Server IP or hostname |
| `SERVER_USER` | SSH username |
| `SSH_PRIVATE_KEY` | SSH private key (ed25519 recommended) |
| `SERVER_PORT` | SSH port (optional, defaults to 22) |

### Setup

1. Go to **Settings > Secrets and variables > Actions**
2. Add the secrets listed above

### Optional: Deploy Protection (paid plans only)

GitHub Actions [environments](https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment) allow adding required reviewers and wait timers before deploys run. This requires **GitHub Pro, Team, or Enterprise** for private repos.

To enable:

1. Go to **Settings > Environments**, create a `production` environment
2. Add protection rules (required reviewers, wait timer, etc.)
3. Add `environment: production` to the `deploy` job in `.github/workflows/cd.yml`

### How it works

1. Push to `main` triggers CI (lint, typecheck, test)
2. If CI passes, CD SSHs into the server and runs `scripts/deploy.sh`
3. The script pulls code, builds images, recreates the bot container, and waits for health
4. If the health check fails within 60s, the deploy is marked as failed

## Manual Deploy

```bash
ssh your-server 'cd /opt/catto && bash scripts/deploy.sh'
```

## Monitoring

### Logs

```bash
# All services
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f

# Bot only
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs -f bot

# Last 100 lines
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 bot
```

### Health check

```bash
curl -s https://api.yourdomain.com/api/health | jq .
```

### Container status

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

## Rollback

### Via git revert (recommended)

```bash
git revert HEAD
git push origin main
# CD auto-deploys the reverted version
```

### Manual rollback to specific commit

```bash
ssh your-server 'cd /opt/catto && git checkout <sha> && bash scripts/deploy.sh'
```

## Dashboard (Vercel)

The Next.js dashboard deploys independently on Vercel.

### Setup

1. Connect your repository to Vercel
2. Set **Root Directory**: `dashboard`
3. Set **Framework Preset**: Next.js
4. Add environment variables:
   - `NEXT_PUBLIC_BOT_API_URL=https://api.yourdomain.com`
   - `BOT_API_URL=https://api.yourdomain.com`
5. Vercel auto-deploys on push to `main`

## Architecture Overview

```
Internet
   |
   v
Caddy (:80/:443, auto-SSL)
   |
   v
Bot (:4000, API + Discord Gateway)
   |
   +---> Redis 7 (cache, queues)
   +---> PostgreSQL 17 (data)
   +---> Watermark (Rust, image processing)

Vercel (dashboard, serverless)
   |
   +---> Bot API via HTTPS
```
