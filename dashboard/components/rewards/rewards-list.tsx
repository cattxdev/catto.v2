'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Reward, Role, XpType } from './types';
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

type FilterType = 'all' | 'enabled' | 'disabled';
type XpFilter = 'all' | XpType;

export function RewardsList({
  rewards,
  roles,
  saving,
  onToggleEnabled,
  onEdit,
  onDelete,
  onAddClick,
}: RewardsListProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [xpFilter, setXpFilter] = useState<XpFilter>('all');

  const filteredRewards = useMemo(() => {
    return rewards.filter((reward) => {
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = reward.name.toLowerCase().includes(searchLower);
        const matchesDesc = reward.description?.toLowerCase().includes(searchLower);
        const matchesLevel = reward.level.toString().includes(searchLower);
        if (!matchesName && !matchesDesc && !matchesLevel) return false;
      }

      // Enabled/disabled filter
      if (filter === 'enabled' && !reward.enabled) return false;
      if (filter === 'disabled' && reward.enabled) return false;

      // XP type filter
      if (xpFilter !== 'all' && reward.xpType !== xpFilter) return false;

      return true;
    });
  }, [rewards, search, filter, xpFilter]);

  const rewardsByLevel = groupRewardsByLevel(filteredRewards);
  const sortedLevels = Object.keys(rewardsByLevel)
    .map(Number)
    .sort((a, b) => a - b);

  const hasFilters = search || filter !== 'all' || xpFilter !== 'all';

  // Empty state - no rewards at all
  if (rewards.length === 0) {
    return (
      <Card variant="glass" className="overflow-hidden">
        <CardContent className="py-16 text-center">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent animate-pulse" />
            <div className="absolute inset-2 rounded-full bg-gradient-to-br from-primary/10 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-12 h-12 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
              </svg>
            </div>
          </div>
          <h3 className="text-xl font-semibold text-foreground mb-2">No Rewards Yet</h3>
          <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
            Reward your members for reaching XP milestones with roles, permissions, and more.
          </p>
          <Button variant="neon" onClick={onAddClick}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Create First Reward
          </Button>

          {/* Feature hints */}
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1">Role Rewards</h4>
              <p className="text-xs text-muted-foreground">Auto-assign roles at level milestones</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1">Permissions</h4>
              <p className="text-xs text-muted-foreground">Grant special permissions as rewards</p>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <h4 className="text-sm font-medium text-foreground mb-1">Announcements</h4>
              <p className="text-xs text-muted-foreground">Celebrate achievements publicly</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search rewards..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          <select value={filter} onChange={(e) => setFilter(e.target.value as FilterType)} className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="all">All Status</option>
            <option value="enabled">Enabled</option>
            <option value="disabled">Disabled</option>
          </select>
          <select value={xpFilter} onChange={(e) => setXpFilter(e.target.value as XpFilter)} className="px-3 py-2 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50">
            <option value="all">All XP Types</option>
            <option value="TEXT">Text XP</option>
            <option value="VOICE">Voice XP</option>
            <option value="BOTH">Both</option>
          </select>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {filteredRewards.length} of {rewards.length} reward{rewards.length !== 1 ? 's' : ''}{hasFilters && ' (filtered)'}
        </span>
        {hasFilters && (
          <button onClick={() => { setSearch(''); setFilter('all'); setXpFilter('all'); }} className="text-primary hover:text-primary/80 transition-colors">
            Clear filters
          </button>
        )}
      </div>

      {/* Empty filtered state */}
      {sortedLevels.length === 0 && hasFilters && (
        <Card variant="glass">
          <CardContent className="py-12 text-center">
            <svg className="w-10 h-10 text-muted-foreground mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h3 className="text-lg font-medium text-foreground mb-1">No matches found</h3>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </CardContent>
        </Card>
      )}

      {/* Rewards grouped by level */}
      {sortedLevels.map((level, index) => (
        <div key={level} className="animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: `${index * 50}ms` }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Level</span>
              <span className="text-lg font-bold text-foreground">{level}</span>
            </div>
            <div className="flex-1 h-px bg-gradient-to-r from-border/50 to-transparent" />
            <span className="text-xs text-muted-foreground">{rewardsByLevel[level].length} reward{rewardsByLevel[level].length !== 1 ? 's' : ''}</span>
          </div>
          <div className="space-y-2 pl-2 border-l-2 border-border/30 ml-4">
            {rewardsByLevel[level].map((reward) => (
              <RewardItem key={reward.id} reward={reward} roles={roles} saving={saving} onToggleEnabled={onToggleEnabled} onEdit={onEdit} onDelete={onDelete} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
