import type {
  XpType,
  RewardType,
  Reward,
  UserRewardClaim,
  RewardTemplate,
  RewardStats,
} from '@/lib/services/rewards.service';

export type { XpType, RewardType, Reward, UserRewardClaim, RewardTemplate, RewardStats };

export interface RewardFormState {
  level: number;
  xpType: XpType;
  rewardType: RewardType;
  roleId: string;
  removeRoleIds: string[];
  channelIds: string[];
  permissions: string[];
  message: string;
  name: string;
  description: string;
  stackable: boolean;
  oneTime: boolean;
}

export interface Role {
  id: string;
  name: string;
  color: number;
}

export interface Channel {
  id: string;
  name: string;
}

export const DEFAULT_FORM_STATE: RewardFormState = {
  level: 1,
  xpType: 'TEXT',
  rewardType: 'ROLE_ADD',
  roleId: '',
  removeRoleIds: [],
  channelIds: [],
  permissions: [],
  message: '',
  name: '',
  description: '',
  stackable: false,
  oneTime: true,
};
