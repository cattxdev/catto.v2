# Rewards System Architecture

## System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Discord Events                            │
│  (Message Sent / Voice Session End)                         │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              XP Systems (Text / Voice)                       │
│  • Award XP based on activity                                │
│  • Calculate new level                                       │
│  • Detect level-up                                           │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼ (if leveled up)
┌─────────────────────────────────────────────────────────────┐
│            RewardIntegration.onLevelUp()                     │
│  • Check eligible rewards for new level                     │
│  • Filter by XP type (TEXT/VOICE/BOTH)                      │
│  • Exclude already claimed rewards                           │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│              RewardService.claimReward()                     │
│  • Validate reward eligibility                               │
│  • Apply reward effects (roles, perms, etc.)                │
│  • Record claim in database                                  │
└───────────────┬─────────────────────────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────────────────────────┐
│                  Discord API                                 │
│  • Add/remove roles                                          │
│  • Modify channel permissions                                │
│  • Send announcements                                        │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

```
┌──────────────────┐         ┌───────────────────┐
│   LevelReward    │◄────────┤ UserRewardClaim   │
├──────────────────┤         ├───────────────────┤
│ id               │         │ id                │
│ guildId          │         │ guildId           │
│ level            │         │ userId            │
│ xpType           │         │ rewardId (FK)     │
│ rewardType       │         │ levelAtClaim      │
│ rewardData (JSON)│         │ xpAtClaim         │
│ name             │         │ status            │
│ description      │         │ claimedAt         │
│ icon             │         │ expiresAt         │
│ oneTime          │         │ revokedAt         │
│ stackable        │         └───────────────────┘
│ requiresPrevious │
│ priority         │         ┌───────────────────┐
│ enabled          │         │ RewardTemplate    │
└──────────────────┘         ├───────────────────┤
                             │ id                │
                             │ name              │
                             │ description       │
                             │ category          │
                             │ template (JSON)   │
                             │ isPublic          │
                             │ isOfficial        │
                             └───────────────────┘
```

## Reward Types by Category

### 🎭 Role Management
```
ROLE_ADD       → Add role to member
ROLE_REMOVE    → Remove role from member
ROLE_STACK     → Add role, keep previous
ROLE_REPLACE   → Replace old role with new
```

### 💰 Economy
```
CURRENCY_GRANT      → Award coins/points
CURRENCY_MULTIPLIER → Boost earning rate
XP_MULTIPLIER       → Boost XP rate
XP_BONUS            → One-time XP grant
DOUBLE_XP_TOKEN     → Activatable boost
```

### 🔐 Permissions & Access
```
PERMISSION_GRANT   → Grant Discord permissions
PERMISSION_REVOKE  → Revoke permissions
CHANNEL_ACCESS     → Unlock channels
CHANNEL_REVOKE     → Lock channels
CATEGORY_ACCESS    → Unlock category
```

### 🎤 Voice Features
```
VOICE_PRIORITY    → Priority speaker
VOICE_SOUNDBOARD  → Soundboard access
VOICE_ACTIVITY    → Activity priority
```

### 🎨 Cosmetic
```
NICKNAME_UNLOCK   → Change nickname freely
COLOR_UNLOCK      → Custom role color
CUSTOM_STATUS     → Custom status/title
PROFILE_BADGE     → Visual badge
```

### 🔧 Features
```
COMMAND_UNLOCK    → Unlock bot commands
FEATURE_UNLOCK    → Unlock bot features
EMBED_UNLOCK      → Post embeds/links
```

### 📢 Special
```
ANNOUNCEMENT      → Send announcement
WEBHOOK_TRIGGER   → External webhook
CUSTOM_REWARD     → Custom logic
```

## Command Structure

```
/rewards
├── list [type: TEXT|VOICE|BOTH]
│   └── Shows all configured rewards
│
├── add
│   ├── level: 1-1000
│   ├── type: Reward type
│   ├── xp-type: TEXT|VOICE|BOTH
│   ├── name: Reward name
│   ├── [role]: For role rewards
│   └── [amount]: For currency/multiplier
│
├── remove
│   └── reward-id: (autocomplete)
│
├── template
│   ├── Basic Role Progression
│   ├── Economy Focus
│   ├── Channel Access
│   └── Voice Specialist
│
├── edit
│   └── reward-id: (autocomplete)
│
└── toggle
    ├── reward-id: (autocomplete)
    └── enabled: true|false
```

## Integration Points

### Text XP Level-Up
```typescript
// In: src/listeners/xp/messageCreate.ts
// After: XP awarded and level calculated

if (result.leveledUp) {
  const rewards = await RewardIntegration.onTextLevelUp(
    guildId, userId, newLevel, totalXp, guild, member
  );
  
  // Add to announcement
  const summary = RewardIntegration.formatRewardsSummary(rewards);
  announcement += summary;
}
```

### Voice XP Level-Up
```typescript
// In: src/listeners/voice-xp/voiceStateUpdate.ts
// After: Voice session ends and XP calculated

if (result.leveledUp) {
  const rewards = await RewardIntegration.onVoiceLevelUp(
    guildId, userId, newLevel, totalXp, guild, member
  );
  
  // Send notification
  const summary = RewardIntegration.formatRewardsSummary(rewards);
  await sendNotification(summary);
}
```

## Configuration Example

### Guild A: Gaming Community
```
Text XP:
  Lv 10: @Active Gamer + 500 coins
  Lv 25: @Veteran + #strategy-chat access + 1.1x XP
  Lv 50: @Legend + #vip-lounge + 1.25x XP

Voice XP:
  Lv 10: @Voice Active + Priority Speaker
  Lv 25: @Talkative + Soundboard
  Lv 50: @Voice Master + Private VC creation
```

### Guild B: Study Server
```
Text XP:
  Lv 5: @Learner
  Lv 15: @Studious + #study-resources
  Lv 30: @Scholar + Embed permissions
  Lv 50: @Expert + #tutors-only

Voice XP:
  Lv 10: @Study Buddy
  Lv 20: @Focus Friend + Study VC access
  Lv 40: @Study Master + Create study sessions
```

## Data Flow

```
User Messages/Joins Voice
        ↓
   XP Awarded
        ↓
Level Up Detected
        ↓
┌───────────────────┐
│ Check Eligibility │
└────────┬──────────┘
         │
         ├─→ Get all rewards for guild at or below user level
         ├─→ Filter by XP type (TEXT/VOICE/BOTH)
         ├─→ Exclude already claimed (if oneTime)
         ├─→ Check requiresPrevious
         └─→ Sort by priority
              ↓
        ┌─────────────┐
        │ Apply Reward │
        └──────┬───────┘
               │
               ├─→ Role: Add/Remove via Discord API
               ├─→ Permission: Update overwrites
               ├─→ Currency: Update economy DB
               ├─→ Channel: Modify overwrites
               └─→ Custom: Execute handler
                     ↓
              ┌────────────┐
              │ Record Claim│
              └──────┬──────┘
                     │
                     ├─→ Create UserRewardClaim
                     ├─→ Set status: ACTIVE
                     ├─→ Record timestamp
                     └─→ Store metadata
                           ↓
                    ┌────────────┐
                    │  Announce  │
                    └────────────┘
                    Display in level-up message
```

## Future Enhancements

### Phase 2
- [ ] Reward shop (spend XP to buy rewards)
- [ ] Seasonal rewards (time-based)
- [ ] Achievement rewards (non-level based)
- [ ] Reward bundles (multiple rewards at once)

### Phase 3
- [ ] Reward leaderboards
- [ ] Reward analytics dashboard
- [ ] Import/export configurations
- [ ] A/B testing for rewards

### Phase 4
- [ ] Random reward pools (loot boxes)
- [ ] Conditional rewards (if/then logic)
- [ ] Cross-server rewards
- [ ] Reward marketplace
