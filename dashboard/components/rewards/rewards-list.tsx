'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { Reward, Role } from './types';
import { RewardItem } from './reward-item';
import { groupRewardsByLevel } from './utils';

interface RewardsListProps {
  rewards: Reward[];
  roles: Role[];
  saving: boolean;
  onToggleEnabled: (rewardId: string, enabled: boolean) => Promise<void>;
  onEdit: (reward: Reward) => void;
  onDelete: (rewardId: string) => Promise<void>;
  onAddClick: () => void;
}

export function RewardsList({
  rewards,
  roles,
  saving,
  onToggleEnabled,
  onEdit,
  onDelete,
  onAddClick,
}: RewardsListProps) {
  const rewardsByLevel = groupRewardsByLevel(rewards);
  const sortedLevels = Object.keys(rewardsByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  if (sortedLevels.length === 0) {
    return (
      <Card variant="glass">
        <CardContent className="py-12 text-center">
          <svg
            className="w-12 h-12 text-muted-foreground mx-auto mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7"
            />
          </svg>
          <h3 className="text-lg font-medium text-foreground mb-2">No Rewards Configured</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first reward or use a template to get started.
          </p>
          <Button variant="neon" onClick={onAddClick}>
            Add Your First Reward
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {sortedLevels.map((level) => (
        <Card key={level} variant="glass">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">
              Level {level}
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({rewardsByLevel[level].length} reward
                {rewardsByLevel[level].length !== 1 ? 's' : ''})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {rewardsByLevel[level].map((reward) => (
                <RewardItem
                  key={reward.id}
                  reward={reward}
                  roles={roles}
                  saving={saving}
                  onToggleEnabled={onToggleEnabled}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
