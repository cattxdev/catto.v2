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
            <CardDescription>Configure how XP is calculated and awarded</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* XP Per Minute */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              XP Per Minute
            </label>
            <div className="relative">
              <Input
                type="number"
                value={config.xpPerMinute}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, xpPerMinute: parseInt(e.target.value) || 0 }))
                }
                min="0"
                max="1000"
                className="pr-16"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">XP/min</span>
            </div>
            <p className="text-xs text-muted-foreground">XP awarded per minute in voice</p>
          </div>

          {/* Min Session Minutes */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-foreground">
              Minimum Session Duration
            </label>
            <div className="relative">
              <Input
                type="number"
                value={config.minSessionMinutes}
                onChange={(e) =>
                  onChange((prev) => ({
                    ...prev,
                    minSessionMinutes: parseInt(e.target.value) || 0,
                  }))
                }
                min="0"
                max="60"
                className="pr-14"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded">mins</span>
            </div>
            <p className="text-xs text-muted-foreground">Minimum time before XP is awarded</p>
          </div>

          {/* XP Mode */}
          <div className="md:col-span-2 space-y-3">
            <label className="block text-sm font-medium text-foreground">
              XP Award Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, xpMode: 'PER_MINUTE' }))}
                className={`group p-4 rounded-lg border transition-all text-left ${
                  config.xpMode === 'PER_MINUTE'
                    ? 'bg-muted/40 border-foreground/30 ring-1 ring-foreground/10'
                    : 'bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${config.xpMode === 'PER_MINUTE' ? 'bg-foreground/10' : 'bg-muted/50'}`}>
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Per Minute</div>
                    <div className="text-xs text-muted-foreground">Award XP every minute</div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, xpMode: 'PER_SESSION' }))}
                className={`group p-4 rounded-lg border transition-all text-left ${
                  config.xpMode === 'PER_SESSION'
                    ? 'bg-muted/40 border-foreground/30 ring-1 ring-foreground/10'
                    : 'bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${config.xpMode === 'PER_SESSION' ? 'bg-foreground/10' : 'bg-muted/50'}`}>
                    <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-medium text-foreground">Per Session</div>
                    <div className="text-xs text-muted-foreground">Award XP when session ends</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* XP Preview */}
          <div className="md:col-span-2 p-4 rounded-lg bg-muted/20 border border-border/30">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>
                A user in voice for <strong className="text-foreground">30 minutes</strong> will earn approximately{' '}
                <strong className="text-foreground">{config.xpPerMinute * 30} XP</strong>
                {config.minSessionMinutes > 0 && (
                  <> (after {config.minSessionMinutes} min minimum)</>
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
