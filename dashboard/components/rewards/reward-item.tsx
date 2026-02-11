'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import type { Reward, Role } from './types';
import { SUPPORTED_REWARD_TYPES, ROLE_REWARD_TYPES } from './constants';

interface RewardItemProps {
  reward: Reward;
  roles: Role[];
  saving: boolean;
  onToggleEnabled: (rewardId: string, enabled: boolean) => Promise<void>;
  onEdit: (reward: Reward) => void;
  onDelete: (rewardId: string) => Promise<void>;
}

export function RewardItem({
  reward,
  roles,
  saving,
  onToggleEnabled,
  onEdit,
  onDelete,
}: RewardItemProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  const role = roles.find((r) => r.id === reward.rewardData.roleId);
  const rewardTypeInfo = SUPPORTED_REWARD_TYPES.find((t) => t.value === reward.rewardType);
  const isRoleReward = ROLE_REWARD_TYPES.includes(reward.rewardType);

  const handleDelete = async () => {
    await onDelete(reward.id);
    setConfirmDelete(false);
  };

  return (
    <div
      className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
        reward.enabled
          ? 'bg-muted/20 border-border/30'
          : 'bg-muted/10 border-border/20 opacity-60'
      }`}
    >
      <div className="flex items-center gap-3">
        {isRoleReward ? (
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: role?.color
                ? `#${role.color.toString(16).padStart(6, '0')}`
                : '#888',
            }}
          />
        ) : (
          <div className="w-3 h-3 rounded-full bg-primary/50" />
        )}
        <div>
          <span className="text-sm font-medium text-foreground">{reward.name}</span>
          {reward.description && (
            <p className="text-xs text-muted-foreground">{reward.description}</p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
              {reward.xpType}
            </span>
            <span className="text-xs px-1.5 py-0.5 rounded bg-secondary/50 text-secondary-foreground">
              {rewardTypeInfo?.label || reward.rewardType}
            </span>
            {reward.stackable && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                Stackable
              </span>
            )}
            {reward.oneTime && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                One-time
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Switch
          checked={reward.enabled}
          onCheckedChange={(checked) => onToggleEnabled(reward.id, checked)}
          disabled={saving}
        />
        <Button variant="ghost" size="sm" onClick={() => onEdit(reward)} disabled={saving}>
          <svg
            className="w-4 h-4 text-muted-foreground"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
        </Button>
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
              Confirm
            </Button>
          </div>
        ) : (
          <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)}>
            <svg
              className="w-4 h-4 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </Button>
        )}
      </div>
    </div>
  );
}
