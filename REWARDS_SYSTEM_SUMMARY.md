# XP Rewards System - Implementation Summary

## What Was Built

A **fully customizable per-guild reward system** for your Discord bot that works with both Text and Voice XP progression.

## 🎯 Key Features

### 1. **Flexible Reward Types**
- **Roles**: Add, remove, stack, or replace roles at specific levels
- **Permissions**: Grant Discord permissions (embed links, external emojis, etc.)
- **Channel Access**: Unlock channels/categories at milestones
- **Economy**: Award virtual currency or earning multipliers
- **XP Boosts**: Permanent or temporary XP multipliers
- **Voice Perks**: Priority speaker, soundboard access
- **Social**: Badges, custom status, nickname permissions
- **Announcements**: Custom messages when rewards are claimed

### 2. **Per-Guild Customization**
- Each server configures its own reward structure
- Different rewards for Text XP, Voice XP, or both
- Full control over levels, types, and quantities
- Enable/disable rewards without deleting
- Priority system for complex reward chains

### 3. **Auto-Application**
- Rewards automatically apply when users level up
- Integrated with existing XP systems
- Tracks claim status per user
- Supports retroactive application

### 4. **Management Tools**
- `/rewards list` - View all configured rewards
- `/rewards add` - Create new rewards
- `/rewards remove` - Delete rewards
- `/rewards toggle` - Enable/disable rewards
- `/rewards template` - Apply preset configurations
- Full autocomplete support

## 📁 Files Created

### Database Schema
- **`prisma/schema.prisma`** - Added 3 new models:
  - `LevelReward` - Defines rewards per level
  - `UserRewardClaim` - Tracks claimed rewards
  - `RewardTemplate` - Preset configurations

### Type Definitions
- **`src/lib/types/rewards.types.ts`** - Complete TypeScript types:
  - All reward types (20+ types)
  - Data interfaces for each reward type
  - Configuration interfaces
  - Preset templates

### Core Services
- **`src/modules/rewards/services/RewardService.ts`** - Main logic:
  - Check eligibility
  - Claim rewards
  - Apply reward effects
  - CRUD operations

### Integration Layer
- **`src/modules/rewards/integrations/RewardIntegration.ts`** - Easy integration:
  - `onTextLevelUp()` - Auto-apply text XP rewards
  - `onVoiceLevelUp()` - Auto-apply voice XP rewards
  - `formatRewardsSummary()` - Format for display
  - `checkMissingRewards()` - Retroactive application

### Commands
- **`src/commands/rewards/rewards.ts`** - Admin command:
  - Full reward management interface
  - Autocomplete for reward IDs
  - Template application

### Documentation
- **`src/modules/rewards/README.md`** - Complete guide with examples
- **`src/modules/rewards/INTEGRATION_EXAMPLES.ts`** - Code examples

## 🚀 Quick Start

### 1. Run Migration
```bash
pnpm prisma migrate dev --name add_reward_system
```

### 2. Apply Rewards Template
In Discord:
```
/rewards template template:Basic Role Progression
```

### 3. Customize Rewards
```
/rewards add level:10 type:Add Role xp-type:BOTH name:Bronze Member role:@Bronze
/rewards add level:25 type:Add Role xp-type:BOTH name:Silver Member role:@Silver
/rewards add level:50 type:Add Role xp-type:BOTH name:Gold Member role:@Gold
```

### 4. Integrate with XP Systems
Add to your text XP level-up handler:

```typescript
import { RewardIntegration } from '@/modules/rewards/integrations/RewardIntegration';

// After level-up is detected
if (result.leveledUp) {
  const rewardResults = await RewardIntegration.onTextLevelUp(
    guildId, userId, newLevel, totalXp, guild, member
  );
  
  const rewardsSummary = RewardIntegration.formatRewardsSummary(rewardResults);
  if (rewardsSummary) {
    levelUpMessage += rewardsSummary;
  }
}
```

## 💡 Example Configurations

### Basic Server (3 Role Tiers)
```
Level 10: Bronze Role
Level 25: Silver Role  
Level 50: Gold Role
```

### Economy Focus
```
Level 5: 500 coins
Level 10: 1000 coins + 10% XP boost
Level 25: 2500 coins + 15% XP boost
Level 50: 5000 coins + 25% XP boost
```

### Progressive Access
```
Level 15: VIP Text Channel access
Level 30: VIP Voice Channel access
Level 50: Premium role + all VIP channels
```

### Voice Specialist
```
Level 10: Voice Chatter role (VOICE only)
Level 25: Priority Speaker permission (VOICE only)
Level 50: Soundboard access (VOICE only)
```

## 🔧 Advanced Features

### Sequential Requirements
Force users to claim rewards in order:
```typescript
requiresPrevious: true  // Must claim all previous level rewards
```

### Priority System
Control application order (higher = first):
```typescript
priority: 10  // Remove old role first
priority: 5   // Then add new role
```

### Temporary Rewards
Set expiration time:
```typescript
{
  multiplier: 2.0,
  durationMinutes: 1440  // 24 hours
}
```

### Role Replacement
Automatically swap roles:
```typescript
{
  roleId: "new-role-id",
  action: "REPLACE",
  removeRoles: ["old-role-id"]
}
```

## 📊 Reward Types Reference

| Type | Description | Example Use |
|------|-------------|-------------|
| `ROLE_ADD` | Add a role | Member tier roles |
| `ROLE_REPLACE` | Replace role | Upgrade from Bronze to Silver |
| `CURRENCY_GRANT` | Award coins | Level-up bonuses |
| `XP_MULTIPLIER` | XP boost | 1.5x permanent boost |
| `CHANNEL_ACCESS` | Unlock channels | VIP lounge access |
| `PERMISSION_GRANT` | Grant perms | Embed/link permissions |
| `VOICE_PRIORITY` | Priority speaker | Voice power users |
| `ANNOUNCEMENT` | Custom message | Special milestones |

## 🎨 Preset Templates

Four built-in templates to get started quickly:

1. **Basic Role Progression** - Simple role rewards every 10 levels
2. **Economy Focus** - Currency + multiplier rewards
3. **Channel Access** - Progressive channel unlocking
4. **Voice Specialist** - Voice-only rewards

## 🔄 Integration Points

The system integrates at these points:

1. **Text XP Level-Up** - In message listener after XP award
2. **Voice XP Level-Up** - In voice session end handler
3. **Manual Claims** - New `/claim` command (optional)
4. **Retroactive** - One-time script for existing users

## 📝 Next Steps

1. ✅ Run the database migration
2. ✅ Set up rewards using commands or templates
3. ✅ Integrate with text XP system
4. ✅ Integrate with voice XP system
5. ✅ Test with different reward types
6. ⬜ (Optional) Add custom reward types
7. ⬜ (Optional) Build reward shop
8. ⬜ (Optional) Add reward analytics

## 🎯 Benefits

- **Engagement**: Users stay active to earn rewards
- **Customization**: Each server can create unique progression
- **Automation**: Rewards apply automatically
- **Flexibility**: Easy to add/remove/modify rewards
- **Scalability**: Works for small and large servers
- **Analytics**: Track what rewards users have claimed

## 🛠️ Maintenance

### View Rewards
```
/rewards list
```

### Disable Without Deleting
```
/rewards toggle reward-id:<id> enabled:false
```

### Bulk Setup
```
/rewards template template:<name>
```

### Clean Up
```
/rewards remove reward-id:<id>
```

---

**The system is now ready to use!** Start by running the migration and configuring your first rewards.
