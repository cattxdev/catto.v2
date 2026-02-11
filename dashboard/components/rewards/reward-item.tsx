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
  const [isHovered, setIsHovered] = useState(false);

  const role = roles.find((r) => r.id === reward.rewardData.roleId);
  const rewardTypeInfo = SUPPORTED_REWARD_TYPES.find((t) => t.value === reward.rewardType);
  const isRoleReward = ROLE_REWARD_TYPES.includes(reward.rewardType);
  const roleColor = role?.color ? `#${role.color.toString(16).padStart(6, '0')}` : '#888';

  const handleDelete = async () => {
    await onDelete(reward.id);
    setConfirmDelete(false);
  };

  // Get icon based on reward type
  const getRewardIcon = () => {
    switch (reward.rewardType) {
      case 'ROLE_ADD':
      case 'ROLE_STACK':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
        );
      case 'ROLE_REMOVE':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
          </svg>
        );
      case 'ROLE_REPLACE':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        );
      case 'PERMISSION_GRANT':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        );
      case 'CHANNEL_ACCESS':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
        );
      case 'ANNOUNCEMENT':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        );
    }
  };

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`group relative flex items-center gap-4 p-4 rounded-lg border transition-all duration-200 ${
        reward.enabled
          ? 'bg-card/50 border-border/50 hover:border-border hover:bg-card/80'
          : 'bg-muted/20 border-border/20 opacity-50 hover:opacity-70'
      }`}
    >
      {/* Left accent bar for role rewards */}
      {isRoleReward && (
        <div
          className="absolute left-0 top-2 bottom-2 w-1 rounded-full transition-all duration-200"
          style={{ backgroundColor: roleColor, opacity: reward.enabled ? 1 : 0.5 }}
        />
      )}

      {/* Icon */}
      <div
        className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
          reward.enabled ? 'bg-primary/10 text-foreground' : 'bg-muted/30 text-muted-foreground'
        }`}
      >
        {getRewardIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className={`font-medium truncate ${reward.enabled ? 'text-foreground' : 'text-muted-foreground'}`}>
            {reward.name}
          </h4>
          {!reward.enabled && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
              Disabled
            </span>
          )}
        </div>
        {reward.description && (
          <p className="text-sm text-muted-foreground truncate mt-0.5">{reward.description}</p>
        )}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
            reward.xpType === 'TEXT' ? 'bg-blue-500/10 text-blue-400' :
            reward.xpType === 'VOICE' ? 'bg-green-500/10 text-green-400' :
            'bg-purple-500/10 text-purple-400'
          }`}>
            {reward.xpType === 'TEXT' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {reward.xpType === 'VOICE' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {reward.xpType === 'BOTH' && <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            {reward.xpType}
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-secondary/50 text-secondary-foreground">
            {rewardTypeInfo?.label || reward.rewardType}
          </span>
          {reward.stackable && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Stack
            </span>
          )}
          {reward.oneTime && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted/50 text-muted-foreground flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Once
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className={`flex items-center gap-2 transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-60'}`}>
        <Switch
          checked={reward.enabled}
          onCheckedChange={(checked) => onToggleEnabled(reward.id, checked)}
          disabled={saving}
        />
        <div className="flex items-center gap-1 pl-2 border-l border-border/30">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onEdit(reward)}
            disabled={saving}
            className="h-8 w-8 p-0"
          >
            <svg className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </Button>
          {confirmDelete ? (
            <div className="flex items-center gap-1 animate-in fade-in slide-in-from-right-2 duration-200">
              <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(false)} className="h-8 text-xs">
                Cancel
              </Button>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving} className="h-8 text-xs">
                Delete
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirmDelete(true)} className="h-8 w-8 p-0">
              <svg className="w-4 h-4 text-muted-foreground hover:text-destructive transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
