# Rewards API Documentation

Complete REST API documentation for the rewards system.

## Base URL
```
/api/guilds/:guildId/rewards
```

---

## Endpoints

### 1. List All Rewards
**GET** `/api/guilds/:guildId/rewards`

Get all rewards configured for a guild.

**Query Parameters:**
- `type` (optional): Filter by XP type (`TEXT`, `VOICE`, `BOTH`)
- `enabled` (optional): Filter by enabled status (`true`, `false`)

**Response:**
```json
{
  "success": true,
  "count": 5,
  "rewards": [
    {
      "id": "reward-id",
      "guildId": "guild-id",
      "level": 10,
      "xpType": "BOTH",
      "rewardType": "ROLE_ADD",
      "rewardData": {
        "roleId": "role-id",
        "action": "ADD"
      },
      "name": "Bronze Member",
      "description": "First milestone role",
      "icon": "🥉",
      "oneTime": true,
      "stackable": false,
      "requiresPrevious": false,
      "priority": 0,
      "enabled": true
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:4000/api/guilds/123456789/rewards?type=TEXT&enabled=true
```

---

### 2. Create Reward
**POST** `/api/guilds/:guildId/rewards`

Create a new reward for a guild.

**Request Body:**
```json
{
  "level": 10,
  "xpType": "BOTH",
  "rewardType": "ROLE_ADD",
  "rewardData": {
    "roleId": "123456789012345678",
    "action": "ADD"
  },
  "name": "Bronze Member",
  "description": "First milestone role",
  "icon": "🥉",
  "oneTime": true,
  "stackable": false,
  "requiresPrevious": false,
  "priority": 0,
  "enabled": true
}
```

**Required Fields:**
- `level` (number, 1-1000)
- `xpType` (string: `TEXT`, `VOICE`, `BOTH`)
- `rewardType` (string: see Reward Types)
- `rewardData` (object: type-specific data)
- `name` (string)

**Optional Fields:**
- `description` (string)
- `icon` (string: emoji like 🥉, 💰, 🎤, etc.)
- `oneTime` (boolean, default: true)
- `stackable` (boolean, default: false)
- `requiresPrevious` (boolean, default: false)
- `priority` (number, default: 0)
- `enabled` (boolean, default: true)

**Response:**
```json
{
  "success": true,
  "reward": { /* reward object */ }
}
```

**Example:**
```bash
curl -X POST http://localhost:4000/api/guilds/123456789/rewards \
  -H "Content-Type: application/json" \
  -d '{
    "level": 10,
    "xpType": "BOTH",
    "rewardType": "ROLE_ADD",
    "rewardData": {"roleId": "987654321", "action": "ADD"},
    "name": "Bronze Member"
  }'
```

---

### 3. Get Single Reward
**GET** `/api/guilds/:guildId/rewards/:rewardId`

Get details of a specific reward.

**Response:**
```json
{
  "success": true,
  "reward": { /* reward object */ }
}
```

**Example:**
```bash
curl http://localhost:4000/api/guilds/123456789/rewards/reward-id
```

---

### 4. Update Reward
**PATCH** `/api/guilds/:guildId/rewards/:rewardId`

Update an existing reward. Only provide fields you want to update.

**Request Body:**
```json
{
  "enabled": false,
  "description": "Updated description",
  "priority": 5
}
```

**Response:**
```json
{
  "success": true,
  "reward": { /* updated reward object */ }
}
```

**Example:**
```bash
curl -X PATCH http://localhost:4000/api/guilds/123456789/rewards/reward-id \
  -H "Content-Type: application/json" \
  -d '{"enabled": false}'
```

---

### 5. Delete Reward
**DELETE** `/api/guilds/:guildId/rewards/:rewardId`

Delete a reward.

**Response:**
```json
{
  "success": true,
  "message": "Reward deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:4000/api/guilds/123456789/rewards/reward-id
```

---

### 6. List Templates
**GET** `/api/guilds/:guildId/rewards/templates`

Get all available reward templates.

**Response:**
```json
{
  "success": true,
  "count": 4,
  "templates": [
    {
      "key": "BASIC_ROLES",
      "name": "Basic Role Progression",
      "description": "Simple role rewards every 10 levels",
      "category": "ROLES",
      "rewardCount": 3
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:4000/api/guilds/123456789/rewards/templates
```

---

### 7. Apply Template
**POST** `/api/guilds/:guildId/rewards/templates/:templateName`

Apply a preset reward template to a guild.

**Template Names:**
- `BASIC_ROLES`
- `ECONOMY_FOCUS`
- `CHANNEL_ACCESS`
- `VOICE_SPECIALIST`

**Response:**
```json
{
  "success": true,
  "template": {
    "name": "Basic Role Progression",
    "description": "Simple role rewards every 10 levels",
    "category": "ROLES"
  },
  "created": 3,
  "rewards": [ /* created rewards */ ]
}
```

**Example:**
```bash
curl -X POST http://localhost:4000/api/guilds/123456789/rewards/templates/BASIC_ROLES
```

---

### 8. Get User Rewards
**GET** `/api/guilds/:guildId/rewards/users/:userId`

Get all rewards claimed by a specific user.

**Response:**
```json
{
  "success": true,
  "count": 3,
  "claims": [
    {
      "id": "claim-id",
      "rewardId": "reward-id",
      "levelAtClaim": 10,
      "xpAtClaim": 1500,
      "status": "ACTIVE",
      "claimedAt": "2026-01-22T12:00:00Z",
      "expiresAt": null,
      "reward": { /* reward object */ }
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:4000/api/guilds/123456789/rewards/users/987654321
```

---

### 9. Rewards Statistics
**GET** `/api/guilds/:guildId/rewards/stats`

Get statistics about rewards in a guild.

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalRewards": 15,
    "enabledRewards": 12,
    "disabledRewards": 3,
    "byXpType": {
      "TEXT": 5,
      "VOICE": 4,
      "BOTH": 6
    },
    "byRewardType": {
      "ROLE_ADD": 8,
      "CURRENCY_GRANT": 4,
      "XP_MULTIPLIER": 3
    },
    "totalClaims": 245,
    "mostClaimedRewards": [
      {
        "id": "reward-id",
        "name": "Bronze Member",
        "level": 10,
        "claims": 87
      }
    ],
    "levelDistribution": {
      "0-9": 2,
      "10-19": 5,
      "20-29": 4,
      "30-39": 2,
      "40-49": 1,
      "50-59": 1
    }
  }
}
```

**Example:**
```bash
curl http://localhost:4000/api/guilds/123456789/rewards/stats
```

---

## Reward Types

### Role Rewards
**ROLE_ADD** - Add a role to the user
```json
{
  "rewardType": "ROLE_ADD",
  "rewardData": {
    "roleId": "123456789012345678",
    "action": "ADD"
  }
}
```

**ROLE_REPLACE** - Replace old role with new
```json
{
  "rewardType": "ROLE_REPLACE",
  "rewardData": {
    "roleId": "123456789012345678",
    "action": "REPLACE",
    "removeRoles": ["987654321098765432"]
  }
}
```

**ROLE_REMOVE** - Remove a role
```json
{
  "rewardType": "ROLE_REMOVE",
  "rewardData": {
    "roleId": "123456789012345678",
    "action": "REMOVE"
  }
}
```

### Currency Rewards
**CURRENCY_GRANT** - Award virtual currency
```json
{
  "rewardType": "CURRENCY_GRANT",
  "rewardData": {
    "amount": 1000,
    "currencyType": "coins",
    "reason": "Level 10 bonus"
  }
}
```

### XP Rewards
**XP_MULTIPLIER** - Permanent or temporary XP boost
```json
{
  "rewardType": "XP_MULTIPLIER",
  "rewardData": {
    "multiplier": 1.5,
    "durationMinutes": 1440,
    "stackable": false,
    "xpType": "BOTH"
  }
}
```

### Channel Access
**CHANNEL_ACCESS** - Grant channel access
```json
{
  "rewardType": "CHANNEL_ACCESS",
  "rewardData": {
    "channelIds": ["123456789012345678"],
    "action": "ADD",
    "overwriteType": "ALLOW"
  }
}
```

### Permissions
**PERMISSION_GRANT** - Grant Discord permissions
```json
{
  "rewardType": "PERMISSION_GRANT",
  "rewardData": {
    "permissions": ["EMBED_LINKS", "USE_EXTERNAL_EMOJIS"],
    "channelIds": ["123456789012345678"]
  }
}
```

### Announcements
**ANNOUNCEMENT** - Send announcement when claimed
```json
{
  "rewardType": "ANNOUNCEMENT",
  "rewardData": {
    "channelId": "123456789012345678",
    "message": "🎉 {user} reached level {level}!",
    "mentionUser": true,
    "embedConfig": {
      "title": "Level Up!",
      "description": "Congratulations!",
      "color": 5793266,
      "thumbnail": "https://example.com/image.png",
      "footer": "Keep it up!"
    }
  }
}
```

---

## Error Responses

All endpoints may return these errors:

### 400 Bad Request
```json
{
  "error": "Invalid request body",
  "message": "Additional details"
}
```

### 404 Not Found
```json
{
  "error": "Guild not found or bot is not in the guild"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "message": "Error details"
}
```

---

## Complete Examples

### Setup Basic Reward System

```bash
# 1. List available templates
curl http://localhost:4000/api/guilds/123456789/rewards/templates

# 2. Apply a template
curl -X POST http://localhost:4000/api/guilds/123456789/rewards/templates/BASIC_ROLES

# 3. View created rewards
curl http://localhost:4000/api/guilds/123456789/rewards

# 4. Add a custom reward
curl -X POST http://localhost:4000/api/guilds/123456789/rewards \
  -H "Content-Type: application/json" \
  -d '{
    "level": 15,
    "xpType": "TEXT",
    "rewardType": "CURRENCY_GRANT",
    "rewardData": {"amount": 500, "currencyType": "coins"},
    "name": "Bonus Coins"
  }'

# 5. Check stats
curl http://localhost:4000/api/guilds/123456789/rewards/stats
```

### Manage Rewards

```bash
# Update a reward
curl -X PATCH http://localhost:4000/api/guilds/123456789/rewards/reward-id \
  -H "Content-Type: application/json" \
  -d '{"enabled": false, "priority": 10}'

# Delete a reward
curl -X DELETE http://localhost:4000/api/guilds/123456789/rewards/reward-id

# Check user's claimed rewards
curl http://localhost:4000/api/guilds/123456789/rewards/users/987654321
```

---

## Rate Limiting

Consider implementing rate limiting for production use:
- Max 60 requests per minute per IP
- Max 100 POST requests per hour per guild

---

## Authentication

These routes should be protected with authentication in production. Consider adding:
- API key authentication
- OAuth2 with Discord
- JWT tokens
- Rate limiting per user/guild

---

## WebSocket Alternative

For real-time updates when rewards are claimed, consider implementing a WebSocket endpoint that broadcasts:
```json
{
  "event": "reward_claimed",
  "guildId": "123456789",
  "userId": "987654321",
  "reward": { /* reward object */ }
}
```
