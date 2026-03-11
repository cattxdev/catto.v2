'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { ChannelSectionProps } from './types';

export function ChannelFilters({ config, onChange, voiceChannels, loading }: ChannelSectionProps) {
  if (loading || voiceChannels.length === 0) return null;

  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-cyan-500/50 to-transparent" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-cyan-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4V2m0 2v2m0-2h11a2 2 0 012 2v11a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2h3zm0 0V2m0 2h10M7 10h.01M11 10h.01M15 10h.01M7 14h.01M11 14h.01M15 14h.01" />
            </svg>
          </div>
          <div>
            <CardTitle>Channel Filters</CardTitle>
            <CardDescription>Control which voice channels award XP</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Allowed Channels */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Allowed Channels
              </label>
              <p className="text-xs text-muted-foreground">
                If set, only these channels will award XP
              </p>
            </div>
            {config.allowedChannels.length > 0 && (
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, allowedChannels: [] }))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
            {voiceChannels.map((channel) => {
              const isSelected = config.allowedChannels.includes(channel.id);
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange((prev) => ({
                        ...prev,
                        allowedChannels: prev.allowedChannels.filter((id) => id !== channel.id),
                      }));
                    } else {
                      onChange((prev) => ({
                        ...prev,
                        allowedChannels: [...prev.allowedChannels, channel.id],
                      }));
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all border ${
                    isSelected
                      ? 'bg-success/10 border-success/30 text-success'
                      : 'bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
                  </svg>
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Selected: {config.allowedChannels.length} {config.allowedChannels.length === 0 && '(all channels allowed)'}
          </p>
        </div>

        <div className="border-t border-border/30" />

        {/* Ignored Channels */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Ignored Channels
              </label>
              <p className="text-xs text-muted-foreground">
                These channels will never award XP
              </p>
            </div>
            {config.ignoredChannels.length > 0 && (
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, ignoredChannels: [] }))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
            {voiceChannels.map((channel) => {
              const isSelected = config.ignoredChannels.includes(channel.id);
              return (
                <button
                  key={channel.id}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      onChange((prev) => ({
                        ...prev,
                        ignoredChannels: prev.ignoredChannels.filter((id) => id !== channel.id),
                      }));
                    } else {
                      onChange((prev) => ({
                        ...prev,
                        ignoredChannels: [...prev.ignoredChannels, channel.id],
                      }));
                    }
                  }}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all border ${
                    isSelected
                      ? 'bg-destructive/10 border-destructive/30 text-destructive'
                      : 'bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40'
                  }`}
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707A1 1 0 0112 5v14a1 1 0 01-1.707.707L5.586 15z" />
                  </svg>
                  <span className="truncate">{channel.name}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Ignored: {config.ignoredChannels.length}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
