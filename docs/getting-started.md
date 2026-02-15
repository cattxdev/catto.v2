# Getting Started

This guide will help you set up and run Catto v2.x locally for development.

## Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [pnpm](https://pnpm.io/) v10+
- [Docker](https://www.docker.com/) and Docker Compose (recommended)
- [Rust](https://rustup.rs/) (optional, for watermark microservice)
- [Chromium/Chrome](#puppeteer-setup) — required by Puppeteer for image generation (manual setup required)

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/cattxdev/catto.v2.git
cd catto
```

### 2. Install Dependencies

```bash
pnpm install
```

### 3. Build Watermark Service (Optional)

For faster evidence image processing, build the Rust watermark microservice:

```bash
cd services/watermark-rs
cargo build --release
cd ../..
```

If not built, the bot will use Sharp-based watermarking as a fallback.

### 4. Configure Environment

Copy the example environment file:

```bash
cp .env.example .env
```

Fill in the required values:

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | Yes |
| `CLIENT_ID` | Discord application client ID | Yes |
| `CLIENT_SECRET` | Discord application client secret | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `REDIS_HOST` | Redis server host | Yes |
| `REDIS_PORT` | Redis server port | Yes |
| `REDIS_PASSWORD` | Redis password (if any) | No |
| `REDIS_DB` | Redis database number | No |
| `OWNER_IDS` | Comma-separated owner user IDs | No |
| `DEFAULT_PREFIX` | Default command prefix | No |
| `API_PORT` | HTTP API port (default: 4000) | No |
| `API_PREFIX` | API route prefix | No |
| `API_ORIGIN` | OAuth2 origin URL | No |
| `API_REDIRECT` | OAuth2 redirect URL | No |
| `B2_ENDPOINT` | Backblaze B2 S3 endpoint (e.g. `https://s3.us-west-004.backblazeb2.com`) | No |
| `B2_REGION` | B2 region (e.g. `us-west-004`) | No |
| `B2_KEY_ID` | B2 application key ID (not master key) | No |
| `B2_APP_KEY` | B2 application key secret | No |
| `B2_BUCKET_NAME` | B2 bucket name | No |
| `B2_BUCKET_ID` | B2 bucket ID | No |
| `EVIDENCE_HMAC_SECRET` | Secret for evidence HMAC signing (min 32 chars) | No |
| `DASHBOARD_URL` | Moderator dashboard URL (default: `http://localhost:3000`) | No |
| `WATERMARK_SERVICE_URL` | Watermark microservice URL (default: `http://localhost:3847`) | No |
| `WATERMARK_MAX_UPLOAD_SIZE` | Max watermark upload size (default: `1gb`) | No |

## Running the Bot

### Option 1: Ephemeral Environment (Recommended for Development)

This starts temporary PostgreSQL and Redis instances in RAM:

```bash
pnpm dev:env
```

The script will:
- Start PostgreSQL and Redis containers
- Update `.env` with ephemeral `DATABASE_URL` and `REDIS_*` values (dev-only)
- Start the watermark microservice (if built)
- Apply migrations and seed the database
- Start the bot in watch mode

### Option 2: Persistent Database

Use Docker Compose for persistent storage:

```bash
# Start PostgreSQL and Redis
docker-compose up -d

# Run migrations
pnpm prisma:migrate

# Start the bot in development mode
pnpm dev
```

## Puppeteer Setup

Catto uses [Puppeteer](https://pptr.dev/) to render HTML templates into images (rank cards, leaderboards, bonk memes, etc.). Puppeteer requires a Chromium binary, which is **not** guaranteed to be downloaded automatically by `pnpm install` (pnpm may skip postinstall scripts depending on your configuration).

### Installing Chromium

After installing dependencies, download a compatible Chromium binary:

```bash
npx puppeteer browsers install chrome
```

Verify it was installed:

```bash
ls ~/.cache/puppeteer/chrome/
```

You should see a directory like `linux-137.0.7151.55` (the version and platform will differ).

### System Dependencies (Linux / WSL)

On Debian/Ubuntu-based systems (including WSL), Chromium needs several system libraries:

```bash
sudo apt-get install -y \
  libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
  libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 \
  libgbm1 libpango-1.0-0 libcairo2 libasound2 libxshmfence1
```

On Alpine (used in Docker):

```bash
apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
```

### Docker / CI

The Dockerfile already handles Puppeteer setup using system Chromium:

```dockerfile
RUN apk add --no-cache chromium nss freetype harfbuzz ca-certificates ttf-freefont
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
```

If using a different base image, prefer the official [Puppeteer Docker images](https://pptr.dev/guides/docker) or install system dependencies manually as shown above.

### Troubleshooting

| Problem | Solution |
|---------|----------|
| `Error: Could not find Chrome` | Run `npx puppeteer browsers install chrome` |
| Sandbox errors on Linux | The bot launches Chromium with `--no-sandbox` for convenience. In production, prefer keeping the sandbox enabled (requires user namespace support). Ensure access to `/dev/shm` or pass `--disable-dev-shm-usage` |
| Missing shared libraries | Install the system dependencies listed above for your distro |
| Slow first image generation | The first call launches a headless browser. Subsequent calls reuse the instance and are much faster |

### How It Works

Both `ImageGeneratorService` and `BonkImageService` extend `BasePuppeteerService` in `src/lib/services/`, which manages the headless Chromium lifecycle. The rendering pipeline:

1. Load an HTML template from `src/lib/templates/`
2. Inject dynamic data (avatars, stats, text) into the template
3. Render the page in headless Chromium
4. Screenshot the target DOM element
5. Return the PNG `Buffer` to attach to the Discord message

Static assets (bonk meme source images) live in `src/lib/assets/` and are copied to `dist/` during the build via `pnpm copy:assets`.

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start bot in watch mode |
| `pnpm dev:env` | Start with ephemeral database + update `.env` |
| `pnpm build` | Compile TypeScript + copy templates and assets |
| `pnpm start` | Run compiled bot |
| `pnpm lint` | Run ESLint |
| `pnpm lint:fix` | Fix ESLint issues |
| `pnpm format` | Format code with Prettier |
| `pnpm typecheck` | Type-check without emitting |
| `pnpm test` | Run tests |
| `pnpm test:watch` | Run tests in watch mode |
| `pnpm docs:all` | Serve documentation locally |

### Prisma Scripts

| Script | Description |
|--------|-------------|
| `pnpm prisma:generate` | Generate Prisma client |
| `pnpm prisma:migrate` | Run migrations |
| `pnpm prisma:migrate:create -- <name>` | Create migration safely for ephemeral DB flow |
| `pnpm prisma:studio` | Open Prisma Studio |
| `pnpm prisma:push` | Push schema changes |
| `pnpm prisma:seed` | Seed the database |
| `pnpm prisma:reset` | Reset the database |

## Project Structure

```
catto/
├── src/
│   ├── index.ts              # Entry point
│   ├── config.ts             # Environment validation
│   ├── structures/           # BotClient and core structures
│   ├── commands/             # Slash commands
│   ├── listeners/            # Event handlers
│   ├── routes/               # REST API endpoints
│   ├── modules/              # Business logic modules
│   ├── lib/                  # Utilities and helpers
│   │   ├── assets/           # Static assets (bonk images, etc.)
│   │   ├── services/         # Image generation (Puppeteer)
│   │   ├── templates/        # HTML templates for image rendering
│   │   ├── storage/          # B2 storage and signing services
│   │   └── validation/       # Gate, permissions, rate limiting
│   ├── preconditions/        # Permission checks
│   └── interactions/         # Button/modal handlers
├── dashboard/                # Next.js moderator dashboard
│   ├── app/mod/              # Mod dashboard pages
│   ├── components/mod/       # Evidence gallery, viewer, upload
│   └── lib/                  # Services and types
├── services/
│   └── watermark-rs/         # Rust watermark microservice
├── prisma/
│   ├── schema.prisma         # Database schema
│   └── seed.ts               # Database seeder
├── languages/                # i18n translations
├── docs/                     # Documentation (you are here)
└── docker-compose.yml        # Docker services
```

## Next Steps

- [Dashboard Setup](dashboard.md) — Run the moderator dashboard and configure OAuth login
- Read the [Architecture](architecture.md) overview
- Learn about [Coding Rules](RULES.md)
- Explore the [Internal APIs](api/index.md)
- Use the [Prisma Migrations guide](api/prisma-migrations.md) when creating schema migrations with ephemeral DBs
- Create your first [Command](commands/creating-commands.md)
