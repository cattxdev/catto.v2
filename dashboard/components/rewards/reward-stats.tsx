'use client';

import { Card, CardContent } from '@/components/ui/card';
import type { RewardStats as RewardStatsType } from './types';

interface RewardStatsProps {
  stats: RewardStatsType;
  levelsWithRewards: number;
}

export function RewardStats({ stats, levelsWithRewards }: RewardStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="text-2xl font-bold text-primary">{stats.totalRewards}</div>
          <div className="text-sm text-muted-foreground">Total Rewards</div>
        </CardContent>
      </Card>
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="text-2xl font-bold text-primary">{stats.enabledRewards}</div>
          <div className="text-sm text-muted-foreground">Enabled</div>
        </CardContent>
      </Card>
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="text-2xl font-bold text-primary">{stats.totalClaims}</div>
          <div className="text-sm text-muted-foreground">Total Claims</div>
        </CardContent>
      </Card>
      <Card variant="glass">
        <CardContent className="py-4">
          <div className="text-2xl font-bold text-primary">{levelsWithRewards}</div>
          <div className="text-sm text-muted-foreground">Levels with Rewards</div>
        </CardContent>
      </Card>
    </div>
  );
}
