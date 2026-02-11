import type { RewardFormState } from './types';
import type { RewardData } from '@/lib/services/rewards.service';

export function buildRewardData(form: RewardFormState): RewardData {
  switch (form.rewardType) {
    case 'ROLE_ADD':
      return { roleId: form.roleId, action: 'ADD' };
    case 'ROLE_REMOVE':
      return { roleId: form.roleId, action: 'REMOVE' };
    case 'ROLE_STACK':
      return { roleId: form.roleId, action: 'STACK' };
    case 'ROLE_REPLACE':
      return { roleId: form.roleId, action: 'REPLACE', removeRoles: form.removeRoleIds };
    case 'PERMISSION_GRANT':
      return { permissions: form.permissions };
    case 'CHANNEL_ACCESS':
      return { channelIds: form.channelIds, action: 'ADD' };
    case 'ANNOUNCEMENT':
      return { message: form.message, mentionUser: true };
    default:
      return { roleId: form.roleId, action: 'ADD' };
  }
}

export function isFormValid(form: RewardFormState): boolean {
  if (!form.name) return false;
  switch (form.rewardType) {
    case 'ROLE_ADD':
    case 'ROLE_REMOVE':
    case 'ROLE_STACK':
      return !!form.roleId;
    case 'ROLE_REPLACE':
      return !!form.roleId && form.removeRoleIds.length > 0;
    case 'PERMISSION_GRANT':
      return form.permissions.length > 0;
    case 'CHANNEL_ACCESS':
      return form.channelIds.length > 0;
    case 'ANNOUNCEMENT':
      return !!form.message;
    default:
      return true;
  }
}

export function groupRewardsByLevel<T extends { level: number }>(
  rewards: T[]
): Record<number, T[]> {
  return rewards.reduce(
    (acc, reward) => {
      const key = reward.level;
      if (!acc[key]) acc[key] = [];
      acc[key].push(reward);
      return acc;
    },
    {} as Record<number, T[]>
  );
}
