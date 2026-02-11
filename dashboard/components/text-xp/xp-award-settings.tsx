'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ConfigSectionProps } from './types';

export function XpAwardSettings({ config, onChange }: ConfigSectionProps) {
  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-blue-500/50 to-transparent" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <div>
            <CardTitle>XP Award Settings</CardTitle>
            <CardDescription>Configure how XP is calculated from messages</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cooldown */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Cooldown
            </label>
            <div className="relative">
              <Input
                type="number"
                value={config.cooldownSec}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, cooldownSec: parseInt(e.target.value) || 0 }))
                }
                min="0"
                max="3600"
                className="pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">secs</span>
            </div>
            <p className="text-xs text-muted-foreground">Time between XP awards</p>
          </div>

          {/* Min Message Length */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Minimum Message Length
            </label>
            <div className="relative">
              <Input
                type="number"
                value={config.minMessageLength}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    minMessageLength: parseInt(e.target.value) || 0,
                  }))
                }
                min="0"
                max="2000"
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">chars</span>
            </div>
            <p className="text-xs text-muted-foreground">Characters required to earn XP</p>
          </div>

          {/* XP Mode */}
          <div className="md:col-span-2 space-y-3">
            <label className="block text-sm font-medium text-foreground">
              XP Award Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, xpMode: 'RANDOM' }))}
                className={`group p-4 rounded-lg border transition-all text-left ${
                  config.xpMode === 'RANDOM'
                    ? 'bg-muted/40 border-foreground/30 ring-1 ring-foreground/10'
                    : 'bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${config.xpMode === 'RANDOM' ? 'bg-foreground/10' : 'bg-muted/50'}`}>
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Random</div>
                    <div className="text-xs text-muted-foreground">Random XP between min and max</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, xpMode: 'FIXED' }))}
                className={`group p-4 rounded-lg border transition-all text-left ${
                  config.xpMode === 'FIXED'
                    ? 'bg-muted/40 border-foreground/30 ring-1 ring-foreground/10'
                    : 'bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${config.xpMode === 'FIXED' ? 'bg-foreground/10' : 'bg-muted/50'}`}>
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Fixed</div>
                    <div className="text-xs text-muted-foreground">Same XP every time</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* XP Values */}
          {config.xpMode === 'RANDOM' ? (
            <>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Minimum XP
                </label>
                <Input
                  type="number"
                  value={config.minXp}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, minXp: parseInt(e.target.value) || 0 }))
                  }
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Lower bound of random XP</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Maximum XP
                </label>
                <Input
                  type="number"
                  value={config.maxXp}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, maxXp: parseInt(e.target.value) || 0 }))
                  }
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Upper bound of random XP</p>
              </div>
            </>
          ) : (
            <div className="md:col-span-2 space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Fixed XP Amount
              </label>
              <Input
                type="number"
                value={config.fixedXp}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, fixedXp: parseInt(e.target.value) || 0 }))
                }
                min="0"
              />
              <p className="text-xs text-muted-foreground">Consistent XP per message</p>
            </div>
          )}

          {/* Max XP per Minute */}
          <div className="md:col-span-2 space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Max XP per Minute (Optional)
            </label>
            <Input
              type="number"
              value={config.maxXpPerMinute || ''}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  maxXpPerMinute: e.target.value ? parseInt(e.target.value) : null,
                }))
              }
              placeholder="No limit"
              min="0"
            />
            <p className="text-xs text-muted-foreground">Prevent XP farming by capping gains per minute</p>
          </div>

          {/* XP Preview */}
          <div className="md:col-span-2 p-5 rounded-lg bg-gradient-to-br from-blue-500/5 via-muted/20 to-purple-500/5 border border-blue-500/20">
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Award Preview</span>
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap text-center">
              <span className="text-sm text-muted-foreground">Each message awards</span>
              {config.xpMode === 'RANDOM' ? (
                <span className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 font-semibold text-foreground">
                  {config.minXp}-{config.maxXp} XP
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 font-semibold text-foreground">
                  {config.fixedXp} XP
                </span>
              )}
              <span className="text-sm text-muted-foreground">with</span>
              <span className="px-3 py-1.5 rounded-lg bg-green-500/10 border border-green-500/20 font-semibold text-foreground">
                {config.cooldownSec}s
              </span>
              <span className="text-sm text-muted-foreground">cooldown</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
