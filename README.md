# Catto v2.x - Discord Bot

A fully-featured Discord bot built with TypeScript and the Sapphire Framework.

## Features

- ✅ **TypeScript** - Fully typed with strict mode enabled
- 🛡️ **Sapphire Framework** - Modern Discord bot framework with powerful features
- 📦 **Modular Architecture** - Well-organized command and event structure
- 🔐 **Preconditions** - Built-in permission checks (OwnerOnly, GuildOnly, DMOnly)
- 🎨 **Code Quality** - ESLint and Prettier configured for consistent code style
- 📝 **Logging** - Integrated logging system via @sapphire/plugin-logger
- ⚡ **Fast Development** - Hot reload with tsx watch mode
- 🌐 **REST API** - Built-in HTTP API with OAuth2 support via @sapphire/plugin-api

## Project Structure

```
catto.v2x/
├── src/
│   ├── commands/          # Command modules
│   │   └── general/       # General commands (ping, info, help)
│   ├── listeners/         # Event listeners
│   │   ├── commands/      # Command-related listeners
│   │   └── ready.ts       # Bot ready event
│   ├── routes/            # API routes
│   │   ├── health.ts      # Health check endpoint
│   │   ├── stats.ts       # Bot statistics endpoint
│   │   ├── ping.ts        # Ping endpoint
│   │   └── guilds.ts      # Guilds information endpoint
│   ├── preconditions/     # Custom preconditions
│   │   ├── OwnerOnly.ts   # Owner-only check
│   │   ├── GuildOnly.ts   # Server-only check
│   │   └── DMOnly.ts      # DM-only check
│   ├── lib/               # Shared utilities
│   │   ├── constants.ts   # Constants and enums
│   │   ├── types.ts       # Type definitions
│   │   └── utils.ts       # Helper functions
│   ├── config.ts          # Configuration loader
│   └── index.ts           # Bot entry point
├── .env.example           # Environment variables template
├── tsconfig.json          # TypeScript configuration
├── eslint.config.js       # ESLint configuration
├── .prettierrc            # Prettier configuration
└── package.json           # Dependencies and scripts
```

### Development Mode (with hot reload)
```bash
pnpm dev
```

### Production Build
```bash
pnpm build
pnpm start
```

### Linting and Formatting
```bash
# Check for linting errors
pnpm lint

# Fix linting errors
pnpm lint:fix

# Format code with Prettier
pnpm format
```

## Available Commands

### General Commands

- `!ping` - Check bot latency and response time
- `!info` - Display bot information and statistics
- `!help` - Show all available commands

## API Endpoints

The bot includes a REST API that runs on `http://localhost:4000/api` by default.

### Available Endpoints

#### GET `/api/health`
Health check endpoint to verify the API is running.

**Response:**
```json
{
  "status": "ok",
  "uptime": 12345,
  "timestamp": 1234567890,
  "message": "Bot API is running"
}
```

#### GET `/api/ping`
Get the bot's websocket ping.

**Response:**
```json
{
  "message": "Pong!",
  "ping": 42,
  "timestamp": 1234567890
}
```

#### POST `/api/ping`
Echo a message back with ping information.

**Request Body:**
```json
{
  "message": "Hello World"
}
```

**Response:**
```json
{
  "echo": "Hello World",
  "ping": 42,
  "timestamp": 1234567890
}
```

#### GET `/api/stats`
Get comprehensive bot statistics.

**Response:**
```json
{
  "guilds": 10,
  "users": 1000,
  "channels": 50,
  "uptime": 123456,
  "memoryUsage": {
    "heapUsed": 100,
    "heapTotal": 200,
    "rss": 150
  },
  "ping": 42
}
```

#### GET `/api/guilds`
Get list of all guilds the bot is in.

**Response:**
```json
{
  "total": 10,
  "guilds": [
    {
      "id": "123456789",
      "name": "My Server",
      "icon": "https://cdn.discordapp.com/...",
      "memberCount": 100,
      "ownerId": "987654321",
      "createdAt": 1234567890
    }
  ]
}
```

### OAuth2 Endpoints

The API also includes built-in OAuth2 endpoints:

- `GET /oauth/callback` - OAuth2 callback handler
- `GET /oauth/user` - Get authenticated user information

### Testing the API

```bash
# Health check
curl http://localhost:4000/api/health

# Get stats
curl http://localhost:4000/api/stats

# Ping endpoint
curl http://localhost:4000/api/ping

# Echo message
curl -X POST http://localhost:4000/api/ping \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'
```


## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

ISC

## Support

For support, questions, or feature requests, please open an issue on the repository.
