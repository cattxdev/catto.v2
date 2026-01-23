# XP Rewards System

A fully customizable per-guild reward system for Text and Voice XP progression.

## Features

- ✅ **Per-Guild Configuration**: Each server can define unique rewards
- 🎯 **Flexible Reward Types**: Roles, permissions, currency, multipliers, and more
- 🔄 **Separate XP Tracks**: Different rewards for Text XP, Voice XP, or both
- 📊 **Auto-Application**: Rewards automatically apply when users level up
- 🎨 **Templates**: Quick-start with preset reward configurations
- 🔧 **Full Management**: Add, edit, remove, enable/disable rewards

## Database Schema

The system uses three main tables:

### `LevelReward`
Defines what reward is given at each level
- `guildId`: Guild this reward belongs to
- `level`: Required level
- `xpType`: TEXT | VOICE | BOTH
- `rewardType`: Type of reward (ROLE_ADD, CURRENCY_GRANT, etc.)
- `rewardData`: JSON data specific to reward type
- `name`, `description`, `icon`: Display information
- `oneTime`, `stackable`, `requiresPrevious`: Behavior flags

### `UserRewardClaim`
Tracks which rewards users have claimed
- `guildId`, `userId`, `rewardId`: Who claimed what
- `status`: ACTIVE | REVOKED | EXPIRED
- `claimedAt`, `expiresAt`: Timing information

### `RewardTemplate`
Pre-made reward configurations for quick setup

## Reward Types

### Role Rewards
- `ROLE_ADD`: Add a role when reaching level
- `ROLE_REMOVE`: Remove a role
- `ROLE_STACK`: Add role, keep previous roles
- `ROLE_REPLACE`: Replace old role with new one

**Example Data:**
```json
{
  "roleId": "123456789012345678",
  "action": "ADD",
  "removeRoles": ["987654321098765432"]  // Optional, for REPLACE
}
```

### Permission Rewards
- `PERMISSION_GRANT`: Grant Discord permissions
- `PERMISSION_REVOKE`: Revoke permissions

**Example Data:**
```json
{
  "permissions": ["EMBED_LINKS", "USE_EXTERNAL_EMOJIS"],
  "channelIds": ["123456789012345678"]  // Optional, specific channels
}
```

### Channel Access
- `CHANNEL_ACCESS`: Grant access to channels
- `CHANNEL_REVOKE`: Remove access
- `CATEGORY_ACCESS`: Grant access to entire category

**Example Data:**
```json
{
  "channelIds": ["123456789012345678", "234567890123456789"],
  "categoryIds": ["345678901234567890"],
  "action": "ADD",
  "overwriteType": "ALLOW"
}
```

### Economy Rewards
- `CURRENCY_GRANT`: Award virtual currency
- `CURRENCY_MULTIPLIER`: Permanent currency earning boost

**Example Data:**
```json
{
  "amount": 1000,
  "currencyType": "coins",
  "reason": "Level 10 bonus"
}
```

### XP Rewards
- `XP_MULTIPLIER`: XP earning boost
- `XP_BONUS`: One-time XP grant
- `DOUBLE_XP_TOKEN`: User-activatable boost

**Example Data:**
```json
{
  "multiplier": 1.5,
  "durationMinutes": 1440,  // null = permanent
  "stackable": false,
  "xpType": "BOTH"
}
```

### Social Rewards
- `NICKNAME_UNLOCK`: Can change nickname
- `COLOR_UNLOCK`: Choose role color
- `CUSTOM_STATUS`: Custom status/title
- `PROFILE_BADGE`: Visual badge on profile

### Voice Rewards
- `VOICE_PRIORITY`: Priority speaker status
- `VOICE_SOUNDBOARD`: Soundboard access
- `VOICE_ACTIVITY`: Voice activity priority

### Special Rewards
- `ANNOUNCEMENT`: Send announcement when claimed
- `WEBHOOK_TRIGGER`: Trigger external webhook
- `CUSTOM_REWARD`: Custom logic (extend the system)

## Usage

### Setup Commands

#### List all rewards
```
/rewards list
/rewards list type:TEXT
/rewards list type:VOICE
```

#### Add a role reward
```
/rewards add level:10 type:Add Role xp-type:BOTH name:Bronze Member role:@Bronze
```

#### Add currency reward
```
/rewards add level:5 type:Grant Currency xp-type:BOTH name:Welcome Bonus amount:500
```

#### Add XP multiplier
```
/rewards add level:20 type:XP Multiplier xp-type:TEXT name:10% Text Boost amount:110
```

#### Apply a template
```
/rewards template template:Basic Role Progression
```

#### Remove a reward
```
/rewards remove reward-id:<reward-id>
```

#### Toggle reward
```
/rewards toggle reward-id:<reward-id> enabled:false
```

## Integration with XP Systems

### Text XP Integration

In your text XP level-up handler:

```typescript
import { RewardIntegration } from '@/modules/rewards/integrations/RewardIntegration';

// After calculating level-up
const rewardResults = await RewardIntegration.onTextLevelUp(
  guildId,
  userId,
  newLevel,
  totalXp,
  guild,
  member
);

// Add rewards to level-up message
const rewardsSummary = RewardIntegration.formatRewardsSummary(rewardResults);
if (rewardsSummary) {
  levelUpMessage += rewardsSummary;
}
```

### Voice XP Integration

In your voice XP level-up handler:

```typescript
import { RewardIntegration } from '@/modules/rewards/integrations/RewardIntegration';

// After calculating level-up
const rewardResults = await RewardIntegration.onVoiceLevelUp(
  guildId,
  userId,
  newLevel,
  totalXp,
  guild,
  member
);

// Add rewards to level-up message
const rewardsSummary = RewardIntegration.formatRewardsSummary(rewardResults);
if (rewardsSummary) {
  levelUpMessage += rewardsSummary;
}
```

## Example Configurations

### Basic Server Setup

1. **Entry Roles** (TEXT & VOICE)
   - Level 5: Newcomer role
   - Level 10: Regular role
   - Level 25: Active Member role
   - Level 50: Veteran role

2. **Currency Rewards** (BOTH)
   - Level 5: 500 coins
   - Level 10: 1000 coins
   - Level 25: 2500 coins
   - Level 50: 5000 coins

3. **XP Multipliers** (stacking)
   - Level 20: 1.1x (10% boost)
   - Level 40: 1.15x (15% boost)
   - Level 60: 1.25x (25% boost)

### Voice-Focused Setup

1. **Voice Roles** (VOICE only)
   - Level 10: Voice Chatter
   - Level 25: Talkative
   - Level 50: Voice Master

2. **Voice Permissions** (VOICE only)
   - Level 25: Priority Speaker
   - Level 50: Soundboard access

3. **Exclusive Channels** (VOICE only)
   - Level 30: VIP Voice Channel access
   - Level 60: Staff Voice Channel access

### Mixed Setup

1. **Text Rewards** (TEXT only)
   - Level 10: Link permission
   - Level 20: Embed permission
   - Level 30: Create threads

2. **Voice Rewards** (VOICE only)
   - Level 10: Priority speaker
   - Level 20: Private VC creation

3. **Combined Rewards** (BOTH)
   - Level 50: Premium role
   - Level 100: Legend role + all permissions

## Advanced Features

### Conditional Rewards

Use `requiresPrevious: true` to force sequential claiming:

```typescript
await rewardService.createReward({
  guildId,
  level: 50,
  xpType: XPType.BOTH,
  rewardType: RewardType.ROLE_ADD,
  rewardData: { roleId: goldRoleId, action: 'ADD' },
  name: 'Gold Member',
  requiresPrevious: true,  // Must have claimed all previous rewards
});
```

### Priority System

Control application order with `priority`:

```typescript
// Remove old role first (higher priority)
await rewardService.createReward({
  level: 25,
  rewardType: RewardType.ROLE_REMOVE,
  rewardData: { roleId: bronzeRoleId, action: 'REMOVE' },
  priority: 10,
});

// Then add new role (lower priority)
await rewardService.createReward({
  level: 25,
  rewardType: RewardType.ROLE_ADD,
  rewardData: { roleId: silverRoleId, action: 'ADD' },
  priority: 5,
});
```

### Temporary Rewards

Some rewards can expire:

```typescript
// 24-hour XP boost
await rewardService.createReward({
  level: 30,
  rewardType: RewardType.XP_MULTIPLIER,
  rewardData: {
    multiplier: 2.0,
    durationMinutes: 1440,  // 24 hours
  },
  name: '24h Double XP',
});
```

## Migration

Run the migration to add the reward tables:

```bash
pnpm prisma migrate dev --name add_reward_system
```

## Future Enhancements

- [ ] Reward shop (spend XP to buy rewards)
- [ ] Seasonal rewards (time-limited)
- [ ] Achievement-based rewards
- [ ] Role color customization
- [ ] Reward history/stats
- [ ] Reward leaderboards
- [ ] Import/export reward configs
- [ ] Visual reward preview
- [ ] Reward dependencies (unlock chains)
- [ ] Random reward pools (loot boxes)
