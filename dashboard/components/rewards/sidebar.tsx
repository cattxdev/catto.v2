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
        { value: stats.totalRewards, label: 'Total', icon: '📦' },
        { value: stats.enabledRewards, label: 'Active', icon: '✓', highlight: true },
        { value: stats.totalClaims, label: 'Claims', icon: '📥' },
        { value: levelsWithRewards, label: 'Levels', icon: '📊' },
      ]
    : [];

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      {stats && (
        <Card variant="glass" className="overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Overview
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-2">
              {statsItems.map((item, i) => (
                <div
                  key={i}
                  className={`relative p-3 rounded-lg border transition-all hover:scale-[1.02] ${
                    item.highlight
                      ? 'bg-primary/5 border-primary/30'
                      : 'bg-muted/20 border-border/30'
                  }`}
                >
                  <div className={`text-2xl font-bold ${item.highlight ? 'text-primary' : 'text-foreground'}`}>
                    {item.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
            {/* Progress indicator */}
            {stats.totalRewards > 0 && (
              <div className="mt-4 pt-3 border-t border-border/30">
                <div className="flex items-center justify-between text-xs mb-2">
                  <span className="text-muted-foreground">Enabled rate</span>
                  <span className="text-foreground font-medium">
                    {Math.round((stats.enabledRewards / stats.totalRewards) * 100)}%
                  </span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary/60 rounded-full transition-all duration-500"
                    style={{ width: `${(stats.enabledRewards / stats.totalRewards) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Templates */}
      {templates.length > 0 && (
        <Card variant="glass" className="overflow-hidden">
          <CardHeader className="pb-2 border-b border-border/30">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
              </svg>
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Quick Start
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-2">
            <p className="text-xs text-muted-foreground">
              {!hasExistingRewards ? 'Get started with a template' : 'Add more rewards'}
            </p>
            {templates.slice(0, 3).map((template, i) => (
              <button
                key={template.key}
                onClick={() => onApplyTemplate(template.key)}
                disabled={saving}
                className="w-full p-3 rounded-lg border border-border/30 bg-gradient-to-r from-muted/20 to-transparent hover:from-muted/40 hover:border-border/50 transition-all text-left group animate-in fade-in slide-in-from-right-2"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                    {template.name}
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                    {template.rewardCount}
                  </span>
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
      <Card variant="glass" className="overflow-hidden">
        <CardHeader className="pb-2 border-b border-border/30">
          <button
            onClick={() => setShowUserLookup(!showUserLookup)}
            className="flex items-center justify-between w-full group"
          >
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider group-hover:text-foreground transition-colors">
                User Lookup
              </CardTitle>
            </div>
            <svg
              className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${showUserLookup ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </CardHeader>
        <div className={`overflow-hidden transition-all duration-300 ${showUserLookup ? 'max-h-96' : 'max-h-0'}`}>
          <CardContent className="pt-4 space-y-3">
            <div className="flex gap-2">
              <Input
                value={userIdLookup}
                onChange={(e) => setUserIdLookup(e.target.value)}
                placeholder="User ID..."
                className="text-sm"
                onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={handleLookup}
                disabled={loadingClaims || !userIdLookup.trim()}
                className="shrink-0"
              >
                {loadingClaims ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                )}
              </Button>
            </div>

            {claimsError && (
              <div className="text-xs text-destructive bg-destructive/10 rounded-lg p-3 flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {claimsError}
              </div>
            )}

            {userClaims && (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {userClaims.length === 0 ? (
                  <div className="text-center py-4">
                    <svg className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-xs text-muted-foreground">No claims found</p>
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground mb-2">
                      {userClaims.length} reward{userClaims.length !== 1 ? 's' : ''} claimed
                    </p>
                    {userClaims.map((claim, i) => {
                      const role = roles.find((r) => r.id === claim.reward.rewardData.roleId);
                      return (
                        <div
                          key={claim.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 border border-border/20 text-xs animate-in fade-in slide-in-from-right-2"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{
                                backgroundColor: role?.color
                                  ? `#${role.color.toString(16).padStart(6, '0')}`
                                  : '#888',
                              }}
                            />
                            <span className="text-foreground truncate">{claim.reward.name}</span>
                          </div>
                          <span
                            className={`shrink-0 ml-2 px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-medium ${
                              claim.status === 'claimed'
                                ? 'bg-success/10 text-success'
                                : claim.status === 'pending'
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {claim.status}
                          </span>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            )}
          </CardContent>
        </div>
      </Card>
    </div>
  );
}
