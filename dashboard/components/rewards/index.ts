// Main component
export { RewardsConfigForm, default } from './rewards-config-form';

// Subcomponents
export { RewardStats } from './reward-stats';
export { UserClaimsLookup } from './user-claims-lookup';
export { RewardTemplates } from './reward-templates';
export { RewardForm } from './reward-form';
export { RewardItem } from './reward-item';
export { RewardsList } from './rewards-list';

// Types
export type {
  RewardFormState,
  Role,
  Channel,
  XpType,
  RewardType,
  Reward,
  UserRewardClaim,
  RewardTemplate,
  RewardStats as RewardStatsType,
} from './types';
export { DEFAULT_FORM_STATE } from './types';

// Constants
export {
  SUPPORTED_REWARD_TYPES,
  DISCORD_PERMISSIONS,
  ROLE_REWARD_TYPES,
} from './constants';
export type { RewardTypeOption, DiscordPermission } from './constants';

// Utils
export { buildRewardData, isFormValid, groupRewardsByLevel } from './utils';
