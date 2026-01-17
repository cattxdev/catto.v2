# Catto v2.x - Discord Bot

## Features

- **TypeScript** - Fully typed with strict mode enabled
- **Sapphire Framework** - Modern Discord bot framework with powerful features
- **Modular Architecture** - Well-organized command and event structure
- **Preconditions** - Built-in permission checks (OwnerOnly, GuildOnly, DMOnly)
- **Code Quality** - ESLint and Prettier configured for consistent code style
- **Logging** - Integrated logging system via @sapphire/plugin-logger
- **Fast Development** - Hot reload with tsx watch mode
- **REST API** - Built-in HTTP API with OAuth2 support via @sapphire/plugin-api
- **Database & Cache** - PostgreSQL (Prisma) and Redis (ioredis) integration

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v20 or higher
- [pnpm](https://pnpm.io/) v10+
- [Docker](https://www.docker.com/) and Docker Compose (recommended for database)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/catto.git
   cd catto
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Configure environment variables:
   Copy the example environment file and fill in your bot token.
   ```bash
   cp .env.example .env
   ```

### Running the Bot

For a seamless development experience, you can use the ephemeral environment command which sets up temporary, seeded PostgreSQL and Redis instances in RAM and starts the bot automatically:

1. Start the ephemeral environment (this will also start the bot; no separate `pnpm dev` is needed):
   ```bash
   pnpm dev:env
If you prefer a persistent database, you can still use Docker Compose:
```bash
docker-compose up -d
pnpm prisma:migrate
pnpm dev
```

## Project Structure

- `src/commands/`: Slash and message commands
- `src/listeners/`: Event handlers for Discord and Sapphire events
- `src/lib/`: Shared utilities, database helpers, and constants
- `src/routes/`: API routes for the built-in HTTP server
- `src/structures/`: Custom classes and extensions

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

ISC
