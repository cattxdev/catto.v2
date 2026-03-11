'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import type { ChannelSectionProps } from './types';

export function LevelUpAnnouncements({ config, onChange, textChannels, loading }: ChannelSectionProps) {
  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-yellow-500/50 to-transparent" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <div>
            <CardTitle>Level-Up Announcements</CardTitle>
            <CardDescription>Celebrate when users reach new voice levels</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable Toggle */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${config.announceLevelUp ? 'bg-yellow-500/10' : 'bg-muted/50'}`}>
              <svg className={`w-5 h-5 transition-colors ${config.announceLevelUp ? 'text-yellow-500' : 'text-muted-foreground'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">Announce Level-Ups</label>
              <p className="text-sm text-muted-foreground">Send a message when users level up</p>
            </div>
          </div>
          <Switch
            checked={config.announceLevelUp}
            onCheckedChange={(checked) => onChange((prev) => ({ ...prev, announceLevelUp: checked }))}
          />
        </div>

        {config.announceLevelUp && (
          <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Announce Channel */}
            {!loading && textChannels.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">
                  Announcement Channel
                </label>
                <select
                  value={config.announceChannelId || ''}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      announceChannelId: e.target.value || null,
                    }))
                  }
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                >
                  <option value="">Current Channel (where user is)</option>
                  {textChannels.map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      # {channel.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  Leave as "Current Channel" to send in the same channel
                </p>
              </div>
            )}

            {/* Message Template */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Message Template
              </label>
              <textarea
                value={config.messageTemplate}
                onChange={(e) =>
                  onChange((prev) => ({ ...prev, messageTemplate: e.target.value }))
                }
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
                rows={3}
                placeholder="GG {user}, you just advanced to level {level}!"
              />
              <div className="flex flex-wrap gap-2">
                {['{user}', '{level}', '{xp}', '{nextLevelXp}'].map((variable) => (
                  <button
                    key={variable}
                    type="button"
                    onClick={() => {
                      onChange((prev) => ({
                        ...prev,
                        messageTemplate: prev.messageTemplate + ' ' + variable,
                      }));
                    }}
                    className="text-xs px-2 py-1 rounded bg-muted/30 border border-border/30 text-muted-foreground hover:bg-muted/50 transition-colors font-mono"
                  >
                    {variable}
                  </button>
                ))}
              </div>
            </div>

            {/* Embed Settings */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${config.embedEnabled ? 'bg-foreground/10' : 'bg-muted/50'}`}>
                  <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                  </svg>
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Use Embed</label>
                  <p className="text-xs text-muted-foreground">Send as an embedded message</p>
                </div>
              </div>
              <Switch
                checked={config.embedEnabled}
                onCheckedChange={(checked) =>
                  onChange((prev) => ({ ...prev, embedEnabled: checked }))
                }
              />
            </div>

            {config.embedEnabled && (
              <div className="space-y-2 animate-in fade-in duration-200">
                <label className="block text-sm font-medium text-foreground">
                  Embed Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={`#${config.embedColor.toString(16).padStart(6, '0')}`}
                    onChange={(e) => {
                      const hex = e.target.value.replace('#', '');
                      const decimal = parseInt(hex, 16);
                      onChange((prev) => ({ ...prev, embedColor: decimal }));
                    }}
                    className="h-10 w-16 rounded-lg border border-border bg-muted cursor-pointer"
                  />
                  <Input
                    type="text"
                    value={`#${config.embedColor.toString(16).padStart(6, '0').toUpperCase()}`}
                    onChange={(e) => {
                      const hex = e.target.value.replace('#', '');
                      if (/^[0-9A-Fa-f]{0,6}$/.test(hex)) {
                        const decimal = parseInt(hex || '0', 16);
                        onChange((prev) => ({ ...prev, embedColor: decimal }));
                      }
                    }}
                    className="flex-1 font-mono uppercase"
                    placeholder="#1A8CFF"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
