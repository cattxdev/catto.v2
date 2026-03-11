'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import type { ConfigSectionProps } from './types';

interface StateFilterItem {
  key: keyof Pick<import('./types').VoiceXPConfig, 'awardMuted' | 'awardDeafened' | 'awardStreaming' | 'awardVideo' | 'ignoreAfkChannel'>;
  label: string;
  description: string;
  icon: React.ReactNode;
}

const STATE_FILTERS: StateFilterItem[] = [
  {
    key: 'awardMuted',
    label: 'Award XP While Muted',
    description: 'Allow XP gain when user is muted',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
      </svg>
    ),
  },
  {
    key: 'awardDeafened',
    label: 'Award XP While Deafened',
    description: 'Allow XP gain when user is deafened',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
      </svg>
    ),
  },
  {
    key: 'awardStreaming',
    label: 'Award XP While Streaming',
    description: 'Give XP when user is screen sharing',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'awardVideo',
    label: 'Award XP With Video On',
    description: 'Give XP when user has video enabled',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'ignoreAfkChannel',
    label: 'Ignore AFK Channel',
    description: "Don't award XP in the AFK channel",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
      </svg>
    ),
  },
];

export function UserStateFilters({ config, onChange }: ConfigSectionProps) {
  const enabledCount = STATE_FILTERS.filter(f => config[f.key]).length;

  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-purple-500/50 to-transparent" />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div>
              <CardTitle>User State Filters</CardTitle>
              <CardDescription>Configure which user states should earn XP</CardDescription>
            </div>
          </div>
          <div className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-full">
            {enabledCount} / {STATE_FILTERS.length} enabled
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {STATE_FILTERS.map((filter, index) => (
          <div 
            key={filter.key}
            className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30 hover:bg-muted/30 transition-colors animate-in fade-in slide-in-from-left-2"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${config[filter.key] ? 'bg-foreground/10 text-foreground' : 'bg-muted/50 text-muted-foreground'}`}>
                {filter.icon}
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">{filter.label}</label>
                <p className="text-xs text-muted-foreground">{filter.description}</p>
              </div>
            </div>
            <Switch
              checked={config[filter.key]}
              onCheckedChange={(checked) => onChange((prev) => ({ ...prev, [filter.key]: checked }))}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
