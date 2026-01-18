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
  - `src/listeners/logs/`: Logging event listeners for all Discord events
- `src/lib/`: Shared utilities, database helpers, and constants
- `src/routes/`: API routes for the built-in HTTP server
  - `src/routes/guilds/logging/`: Logging system API endpoints
- `src/structures/`: Custom classes and extensions

## Logging System

The bot includes a production-ready logging system powered by **BullMQ** that tracks 17 different types of Discord events across multiple channels using webhooks.

### Features

- **17 Log Types**: Messages, Voice, Voice State, Tickets, Transcripts, Roles, Channels, Members, Stage, Events, Polls, Emojis, Stickers, Webhooks, Joins, Leaves, Server
- **BullMQ Job Queue**: Reliable job processing with automatic retries and rate limiting
- **Automatic Retries**: Up to 3 attempts with exponential backoff (2s → 4s → 8s)
- **Rate Limiting**: Max 50 jobs per second to prevent Discord rate limits
- **Concurrency**: Processes up to 5 logs simultaneously
- **Job Persistence**: Logs survive bot restarts (Redis-backed)
- **Error Tracking**: Failed jobs kept for 24 hours for debugging
- **Webhook-based**: Uses Discord webhooks for reliable delivery
- **Spanish Names**: Channels follow Spanish naming convention (logs-mensajes, logs-voz, etc.)

### API Endpoints

#### Setup Logging System
```bash
POST /api/guilds/{guildId}/logging/setup
```
Creates a "📋 Logs Admin" category with 17 log channels and webhooks. Saves configuration to database.

**Response:**
```json
{
  "success": true,
  "categoryId": "1234567890",
  "channelsCreated": 17
}
```

#### Get Logging Configuration
```bash
GET /api/guilds/{guildId}/logging/config
```
Returns current logging configuration and channel status.

#### Toggle Logging System
```bash
PATCH /api/guilds/{guildId}/logging/config
```
Enable or disable logging without deleting channels.

**Body:**
```json
{
  "enabled": true
}
```

#### Delete Logging System
```bash
DELETE /api/guilds/{guildId}/logging/delete
```
Removes all log channels, category, and database configuration.

### Logged Events

The system automatically logs the following Discord events:

- **Messages**: Message deletions and edits
- **Voice**: Join/leave/move between voice channels
- **Voice State**: Mute, deaf, streaming, video state changes
- **Members**: Join, leave, nickname changes, role changes, timeouts
- **Roles**: Create, update, delete roles and permission changes
- **Channels**: Create, update, delete channels
- **Emojis**: Create, update, delete emojis
- **Stickers**: Create, update, delete stickers
- **Webhooks**: Webhook updates
- **Stage**: Stage instance create, update, delete
- **Events**: Scheduled event create, update, delete
- **Server**: Server settings updates
- **Joins/Leaves**: Detailed member join/leave tracking

### Usage

1. Make a POST request to setup the logging system:
```bash
curl -X POST http://localhost:4000/api/guilds/YOUR_GUILD_ID/logging/setup
```

2. The bot will automatically start logging events to the appropriate channels

3. To disable temporarily, send a PATCH request:
```bash
curl -X PATCH http://localhost:4000/api/guilds/YOUR_GUILD_ID/logging/config \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

4. To completely remove the logging system:
```bash
curl -X DELETE http://localhost:4000/api/guilds/YOUR_GUILD_ID/logging/delete
```

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

ISC
