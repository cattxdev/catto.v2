# Quick Setup Guide - Rewards System

## ⚡ 5-Minute Setup

### Step 1: Database Migration ✅
Already completed! The tables are created.

### Step 2: Integrate with Text XP

Find your text XP level-up handler (likely in a message listener) and add:

```typescript
import { RewardIntegration } from '@/modules/rewards';

// After detecting level-up
if (result.leveledUp) {
  const member = await guild.members.fetch(userId);
  
  const rewards = await RewardIntegration.onTextLevelUp(
    guildId,
    userId,
    result.newLevel,
    result.newXp,
    guild,
    member
  );
  
  const rewardsSummary = RewardIntegration.formatRewardsSummary(rewards);
  if (rewardsSummary) {
    // Add to your level-up announcement
    levelUpMessage += rewardsSummary;
  }
}
```

### Step 3: Integrate with Voice XP

Find your voice XP level-up handler and add:

```typescript
import { RewardIntegration } from '@/modules/rewards';

// After detecting voice level-up
if (result.leveledUp) {
  const member = await guild.members.fetch(userId);
  
  const rewards = await RewardIntegration.onVoiceLevelUp(
    guildId,
    userId,
    result.newLevel,
    result.newXp,
    guild,
    member
  );
  
  // Optionally send notification
  const summary = RewardIntegration.formatRewardsSummary(rewards);
}
```

### Step 4: Test In Discord

1. Use `/rewards template template:Basic Role Progression`
2. Create some test roles (Bronze, Silver, Gold)
3. Edit the reward role IDs using `/rewards edit`
4. Level up and watch rewards apply!

## 📋 Common Setups

### Setup A: Simple Role Progression
```
/rewards add level:10 type:Add Role xp-type:BOTH name:Bronze Member role:@Bronze
/rewards add level:25 type:Add Role xp-type:BOTH name:Silver Member role:@Silver
/rewards add level:50 type:Add Role xp-type:BOTH name:Gold Member role:@Gold
```

### Setup B: Economy + Roles
```
/rewards add level:5 type:Grant Currency xp-type:BOTH name:Starter Pack amount:500
/rewards add level:10 type:Add Role xp-type:BOTH name:Regular role:@Regular
/rewards add level:10 type:Grant Currency xp-type:BOTH name:Level 10 Bonus amount:1000
/rewards add level:20 type:XP Multiplier xp-type:BOTH name:10% Boost amount:110
```

### Setup C: Channel Access
```
/rewards add level:15 type:Channel Access xp-type:BOTH name:VIP Text Access
/rewards add level:30 type:Channel Access xp-type:VOICE name:VIP Voice Access
```

### Setup D: Voice Specialist
```
/rewards add level:10 type:Add Role xp-type:VOICE name:Voice Chatter role:@Voice Chatter
/rewards add level:25 type:Voice Priority xp-type:VOICE name:Priority Speaker
/rewards add level:50 type:Add Role xp-type:VOICE name:Voice Master role:@Voice Master
```

## 🔧 Troubleshooting

### Rewards not applying?
1. Check `/rewards list` to see if enabled
2. Verify role exists and bot has permissions
3. Check console logs for errors
4. Ensure integration code is in the right place

### Can't find reward ID?
Use autocomplete in `/rewards remove` or `/rewards toggle` commands - it will show all rewards with their names and levels.

### Need to fix a reward?
```
/rewards remove reward-id:<id>
/rewards add ... (create new one)
```

### Want to test without leveling?
Modify a user's level in the database temporarily, then trigger a level-up event.

## 📝 Checklist

- [x] Database migration complete
- [ ] Text XP integration added
- [ ] Voice XP integration added  
- [ ] Test roles created
- [ ] First reward configured
- [ ] Tested level-up with rewards
- [ ] Documented for your team

## 🎯 Next Actions

1. **Add text XP integration** (5 min)
2. **Add voice XP integration** (5 min)
3. **Configure first rewards** (10 min)
4. **Test in your server** (5 min)

**Total time: ~25 minutes** to have a fully functional reward system!

## 💡 Pro Tips

- Start with templates, then customize
- Use separate rewards for text vs voice to encourage both activities
- Stack multipliers at higher levels to accelerate progression
- Create "prestige" roles at very high levels (100+)
- Use announcements for special milestones (50, 100, etc.)
- Check reward claims in database to see what's popular

## 📚 Full Documentation

- **README.md** - Complete feature documentation
- **ARCHITECTURE.md** - System design and flow
- **INTEGRATION_EXAMPLES.ts** - Code examples
- **REWARDS_SYSTEM_SUMMARY.md** - Overview

---

Ready to boost engagement? Configure your first reward now! 🚀
