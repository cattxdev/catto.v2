'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { UserRewardClaim, Role } from './types';

interface UserClaimsLookupProps {
  roles: Role[];
  getUserRewards: (
    userId: string
  ) => Promise<{ success: boolean; claims?: UserRewardClaim[]; error?: string }>;
}

export function UserClaimsLookup({ roles, getUserRewards }: UserClaimsLookupProps) {
  const [userIdLookup, setUserIdLookup] = useState('');
  const [userClaims, setUserClaims] = useState<UserRewardClaim[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLookup = async () => {
    if (!userIdLookup.trim()) return;

    setLoading(true);
    setError(null);
    setUserClaims(null);

    const result = await getUserRewards(userIdLookup.trim());

    if (result.success && result.claims) {
      setUserClaims(result.claims);
    } else {
      setError(result.error || 'Failed to fetch user claims');
    }

    setLoading(false);
  };

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>User Reward Claims</CardTitle>
        <CardDescription>Look up which rewards a user has claimed</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={userIdLookup}
            onChange={(e) => setUserIdLookup(e.target.value)}
            placeholder="Enter user ID..."
            className="flex-1"
          />
          <Button
            variant="outline"
            onClick={handleLookup}
            disabled={loading || !userIdLookup.trim()}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Searching...
              </>
            ) : (
              'Look Up'
            )}
          </Button>
        </div>

        {error && (
          <div className="text-sm text-destructive bg-destructive/10 rounded-lg p-3">{error}</div>
        )}

        {userClaims && (
          <div className="space-y-2">
            {userClaims.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No rewards claimed by this user yet.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  {userClaims.length} reward{userClaims.length !== 1 ? 's' : ''} claimed
                </p>
                <div className="max-h-64 overflow-y-auto space-y-2">
                  {userClaims.map((claim) => {
                    const role = roles.find((r) => r.id === claim.reward.rewardData.roleId);
                    return (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor: role?.color
                                ? `#${role.color.toString(16).padStart(6, '0')}`
                                : '#888',
                            }}
                          />
                          <div>
                            <span className="text-sm font-medium text-foreground">
                              {claim.reward.name}
                            </span>
                            <p className="text-xs text-muted-foreground">
                              Level {claim.levelAtClaim} - {claim.xpAtClaim.toLocaleString()} XP
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs px-1.5 py-0.5 rounded ${
                              claim.status === 'claimed'
                                ? 'bg-success/10 text-success'
                                : claim.status === 'pending'
                                  ? 'bg-warning/10 text-warning'
                                  : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {claim.status}
                          </span>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(claim.claimedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
