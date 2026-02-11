'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { RewardStats as RewardStatsType } from './types';

interface RewardStatsProps {
  stats: RewardStatsType;
  levelsWithRewards: number;
  variant?: 'horizontal' | 'vertical';
}

export function RewardStats({ stats, levelsWithRewards, variant = 'horizontal' }: RewardStatsProps) {
  const items = [
    { value: stats.totalRewards, label: 'Total Rewards', icon: '🎁' },
    { value: stats.enabledRewards, label: 'Enabled', icon: '✓' },
    { value: stats.totalClaims, label: 'Claims', icon: '📥' },
    { value: levelsWithRewards, label: 'Levels', icon: '📊' },
  ];

  if (variant === 'vertical') {
    return (
      <Card variant="glass">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {items.map((item, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span className="text-lg font-bold text-foreground">{item.value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {items.map((item, i) => (
        <Card key={i} variant="glass">
          <CardContent className="py-4 text-center">
            <div className="text-2xl font-bold text-foreground">{item.value}</div>
            <div className="text-xs text-muted-foreground mt-1">{item.label}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
