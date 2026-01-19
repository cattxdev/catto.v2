# XP/Leveling System Module

A comprehensive text-based XP and leveling system for Discord guilds with per-guild configuration, anti-spam measures, and REST API management.

## 📋 Features

- **Message-Based XP Awards**: Earn XP for sending text messages
- **Anti-Spam Protection**: Configurable cooldown and rate limiting
- **Flexible Level Curves**: Formula-based or custom table-based progression
- **Per-Guild Configuration**: Fully customizable settings per server
- **Channel & Role Filters**: Control where and who can earn XP
- **Level-Up Announcements**: Customizable messages with embeds
- **Leaderboards**: Paginated rankings by XP
- **Audit Logging**: Complete event history for debugging
- **Concurrency Safe**: Transaction-based with row locking to prevent race conditions
- **Sharding Ready**: Safe for multi-shard deployments
- **REST API Only**: All configuration via API endpoints (no slash commands)

## 🏗️ Architecture

```
src/modules/xp-text/     # Core module logic
├── services/            # Business logic
│   ├── xp-text-config.service.ts      # Config management + TTL cache
│   ├── xp-text-level.service.ts       # Level calculations
│   ├── xp-text-award.service.ts       # XP awarding with cooldown
│   └── xp-text-leaderboard.service.ts # Leaderboard queries
├── repositories/        # Database layer
│   ├── xp-text.repository.ts          # UserXP CRUD
│   └── xp-text-config.repository.ts   # GuildXPConfig CRUD
├── dtos/                # Data transfer objects
│   ├── update-xp-config.dto.ts        # Config update validation
│   └── award-preview.dto.ts           # Award calculation preview
├── types/               # TypeScript definitions
│   └── xp-text.types.ts               # Enums, interfaces
├── utils/               # Helper functions
│   ├── level-curve.ts                 # Level calculation logic
│   ├── validation.ts                  # Rule checking
│   └── templates.ts                   # Message placeholder replacement
└── index.ts             # Module exports

src/listeners/xp/        # Discord event handlers (Sapphire pattern)
└── messageCreateXP.ts   # messageCreate handler for XP awards

src/routes/guilds/xp/    # REST API endpoints
├── config.ts            # GET/PUT config
├── stats.ts             # GET user stats
├── leaderboard.ts       # GET leaderboard
├── reset-user.ts        # POST reset user
├── reset-guild.ts       # POST reset guild
└── recalc.ts            # POST recalculate levels
```

## 🗄️ Database Schema

### GuildXPConfig
Per-guild configuration with:
- XP modes: `RANDOM` (range) or `FIXED` (constant)
- Cooldown enforcement (default: 60s)
- Channel/role filters (JSONB arrays)
- Level-up announcement settings
- Curve configuration (formula or table)

### UserXP
User progress tracking:
- Unique per `(guildId, userId)`
- Tracks: `xp`, `level`, `messageCount`, `lastAwardAt`
- Indexed by `(guildId, xp DESC)` for fast leaderboards

### XPEventLog
Audit trail for all XP events:
- Event types: `AWARD`, `LEVEL_UP`, `RESET`, `MANUAL_ADJUST`
- Before/after snapshots
- Optional metadata (channelId, messageId, etc.)

## 🔧 Configuration Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enabled` | Boolean | `true` | Enable/disable XP system |
| `cooldownSec` | Number | `60` | Cooldown between XP awards (seconds) |
| `xpMode` | String | `"RANDOM"` | `"RANDOM"` or `"FIXED"` |
| `minXp` | Number | `15` | Minimum XP (RANDOM mode) |
| `maxXp` | Number | `25` | Maximum XP (RANDOM mode) |
| `fixedXp` | Number | `20` | Fixed XP amount (FIXED mode) |
| `minMessageLength` | Number | `5` | Minimum message length |
| `maxXpPerMinute` | Number | `null` | Optional rate limit |
| `allowedChannels` | String[] | `[]` | Whitelist (empty = all) |
| `ignoredChannels` | String[] | `[]` | Blacklist channels |
| `ignoredRoles` | String[] | `[]` | Blacklist roles |
| `announceLevelUp` | Boolean | `true` | Announce level-ups |
| `announceChannelId` | String | `null` | Announcement channel (null = same) |
| `messageTemplate` | String | `"🎉 {user} reached level {level}!"` | Template with placeholders |
| `embedEnabled` | Boolean | `true` | Use embed for announcements |
| `embedColor` | Number | `5793266` | Embed color (Discord Blurple) |
| `levelCurveType` | String | `"FORMULA"` | `"FORMULA"` or `"TABLE"` |
| `formulaBase` | Number | `5.0` | Formula: base × level² + offset |
| `formulaExponent` | Number | `2.0` | Formula: level exponent |
| `formulaOffset` | Number | `50.0` | Formula: constant offset |
| `tableThresholds` | Number[] | `[]` | Custom XP thresholds per level |

### Template Placeholders
- `{user}` - User mention
- `{level}` - New level reached
- `{xpGain}` - XP gained from message
- `{totalXp}` - Total XP after gain

## 🌐 REST API Endpoints

### Public Endpoints

#### `GET /api/xp-text/config/:guildId`
Get guild configuration (creates default if not exists).

**Response:**
```json
{
  "guildId": "123456789",
  "enabled": true,
  "cooldownSec": 60,
  "xpMode": "RANDOM",
  "minXp": 15,
  "maxXp": 25,
  ...
}
```

#### `PUT /api/xp-text/config/:guildId`
Update guild configuration.

**Body:**
```json
{
  "enabled": true,
  "cooldownSec": 30,
  "minXp": 10,
  "maxXp": 20,
  "ignoredChannels": ["123", "456"],
  "announceLevelUp": true
}
```

#### `GET /api/xp-text/users/:guildId/:userId`
Get user XP stats.

**Response:**
```json
{
  "userId": "987654321",
  "guildId": "123456789",
  "xp": 1250,
  "level": 5,
  "nextLevelXp": 1500,
  "progress": 0.833,
  "messageCount": 120,
  "lastAwardAt": "2026-01-18T20:00:00.000Z"
}
```

#### `GET /api/xp-text/leaderboard/:guildId?limit=10&offset=0`
Get top users by XP.

**Query Parameters:**
- `limit` (default: 10, max: 100)
- `offset` (default: 0)

**Response:**
```json
{
  "guildId": "123456789",
  "users": [
    {
      "userId": "111",
      "username": "User1",
      "xp": 5000,
      "level": 12,
      "messageCount": 500,
      "rank": 1
    },
    ...
  ],
  "total": 150,
  "limit": 10,
  "offset": 0
}
```

### Admin Endpoints

#### `POST /api/xp-text/reset/user`
Reset a user's XP in a guild.

**Body:**
```json
{
  "guildId": "123456789",
  "userId": "987654321"
}
```

#### `POST /api/xp-text/reset/guild`
Reset all users' XP in a guild.

**Body:**
```json
{
  "guildId": "123456789"
}
```

#### `POST /api/xp-text/recalc/:guildId`
Recalculate all user levels after curve changes.

**Response:**
```json
{
  "guildId": "123456789",
  "status": "processing",
  "totalUsers": 1500,
  "processed": 0,
  "message": "Recalculation started"
}
```

## 🔒 Concurrency Safety

The system uses **row-level locking** with `SELECT ... FOR UPDATE` to prevent race conditions:

1. **Transaction Isolation**: All XP awards wrapped in Prisma transactions
2. **Row Locking**: UserXP row locked during award calculation
3. **Cooldown Check**: `lastAwardAt` verified after lock acquired
4. **Atomic Updates**: Single upsert operation for XP/level/timestamp

This ensures:
- ✅ No double-counting from simultaneous messages
- ✅ Accurate cooldown enforcement
- ✅ No lost updates from concurrent transactions
- ✅ Safe for sharded deployments

## 📊 Default Level Curve

**Formula**: `xpRequired = 5 × (level² + 10 × level + 20)`

| Level | Total XP | XP Needed |
|-------|----------|-----------|
| 1 | 175 | 175 |
| 2 | 370 | 195 |
| 3 | 585 | 215 |
| 4 | 820 | 235 |
| 5 | 1075 | 255 |
| 10 | 2600 | 380 |
| 20 | 7700 | 680 |
| 50 | 39500 | 1580 |

## 🚀 Usage Example

```typescript
// Routes are automatically registered via src/routes/guilds/xp/
// Listeners are automatically discovered by Sapphire in src/listeners/xp/
// No manual registration needed - Sapphire handles auto-discovery
```

## 🧪 Testing Considerations

1. **Cooldown Tests**: Verify rapid messages respect cooldown
2. **Race Condition Tests**: Send simultaneous messages, check XP count
3. **Filter Tests**: Verify ignored channels/roles work correctly
4. **Level-Up Tests**: Check announcement delivery and template rendering
5. **Leaderboard Tests**: Verify pagination and sorting
6. **Cache Tests**: Update config, verify cache invalidation

## 📝 Implementation Notes

### Cache Strategy
- **TTL**: 5 minutes per guild config
- **Invalidation**: Manual flush on PUT config
- **Trade-off**: Up to 5min stale data vs reduced DB load

### Level Curve Types
- **FORMULA**: Good for consistent progression (e.g., Mee6 style)
- **TABLE**: Good for custom milestones (e.g., accelerated early levels)

### JSONB Arrays vs JOIN Tables
- **Choice**: JSONB arrays for channels/roles
- **Reason**: Simpler queries, better for <100 entries
- **Trade-off**: Harder to index/query partially

## 🛠️ Deployment

1. Run Prisma migration: `npx prisma migrate deploy`
2. Set environment variables (if needed)
3. Start bot with XP module enabled
4. Configure guilds via REST API

## 📚 Dependencies

- `discord.js` - Discord API
- `@sapphire/framework` - Bot framework
- `@prisma/client` - Database ORM
- Container pattern for service access
