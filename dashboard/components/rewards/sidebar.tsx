'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { RewardStats as RewardStatsType, RewardTemplate, Role, UserRewardClaim } from './types';

interface SidebarProps {
  stats: RewardStatsType | null;
  levelsWithRewards: number;
  templates: RewardTemplate[];
  hasExistingRewards: boolean;
  roles: Role[];
  saving: boolean;
  onApplyTemplate: (templateName: string) => Promise<void>;
  getUserRewards: (userId: string) => Promise<{ success: boolean; claims?: UserRewardClaim[]; error?: string }>;
}

export function Sidebar({
  stats,
  levelsWithRewards,
  templates,
  hasExistingRewards,
  roles,
  saving,
  onApplyTemplate,
  getUserRewards,
}: SidebarProps) {
  const [showUserLookup, setShowUserLookup] = useState(false);
  const [userIdLookup, setUserIdLookup] = useState('');
  const [userClaims, setUserClaims] = useState<UserRewardClaim[] | null>(null);
  const [loadingClaims, setLoadingClaims] = useState(false);
  const [claimsError, setClaimsError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!userIdLookup.trim()) return;
    setLoadingClaims(true);
    setClaimsError(null);
    setUserClaims(null);
    const result = await getUserRewards(userIdLookup.trim());
    if (result.success && result.claims) {
      setUserClaims(result.claims);
    } else {
      setClaimsError(result.error || 'Failed to fetch user claims');
    }
    setLoadingClaims(false);
  };

  const statsItems = stats
    ? [
        { value: stats.totalRewards, label: 'Total' },
        { value: stats.enabledRewards, label: 'Enabled' },
        { value: stats.totalClaims, label: 'Claims' },
        { value: levelsWithRewards, label: 'Levels' },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      {stats && (
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 gap-3">
              {statsItems.map((item, i) => (
                <div key={i} className="text-center p-3 rounded-lg bg-muted/30">
                  <div className="text-xl font-bold text-foreground">{item.value}</div>
                  <div className="text-xs text-muted-foreground">{item.label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Templates */}
      {templates.length > 0 && (
        <Card variant="glass">
          <CardHeader className="pb-3">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Quick Start
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <p className="text-xs text-muted-foreground mb-3">
              {!hasExistingRewards ? 'Get started with a template' : 'Add more rewards'}
            </p>
            {templates.slice(0, 3).map((template) => (
              <button
                key={template.key}
                onClick={() => onApplyTemplate(template.key)}
                disabled={saving}
                className="w-full p-3 rounded-lg border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors text-left group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {template.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{template.rewardCount}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {template.description}
                </p>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {/* User Lookup */}
      <Card variant="glass">
        <CardHeader className="pb-3">
          <button
            onClick={() => setShowUserLookup(!showUserLookup)}
            className="flex items-center justify-between w-full"
          >
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              User Lookup
            </CardTitle>
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform ${showUserLookup ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </CardHeader>
        {showUserLookup && (
          <CardContent className="pt-0 space-y-3">
            <div className="flex gap-2">
              <Input
                value={userIdLookup}
                onChange={(e) => setUserIdLookup(e.target.value)}
                placeholder="User ID..."
                className="text-sm"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLookup}
                disabled={loadingClaims || !userIdLookup.trim()}
              >
                {loadingClaims ? '...' : 'Go'}
              </Button>
            </div>

            {claimsError && (
              <div className="text-xs text-destructive bg-destructive/10 rounded p-2">
                {claimsError}
              </div>
            )}

            {userClaims && (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {userClaims.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-2">No claims found</p>
                ) : (
                  userClaims.map((claim) => {
                    const role = roles.find((r) => r.id === claim.reward.rewardData.roleId);
                    return (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between p-2 rounded bg-muted/20 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: role?.color
                                ? `#${role.color.toString(16).padStart(6, '0')}`
                                : '#888',
                            }}
                          />
                          <span className="text-foreground">{claim.reward.name}</span>
                        </div>
                        <span
                          className={`px-1.5 py-0.5 rounded ${
                            claim.status === 'claimed'
                              ? 'bg-success/10 text-success'
                              : 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {claim.status}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
