'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { FilterSectionProps } from './types';

export function ChannelRoleFilters({ config, onChange, channels, roles, loading }: FilterSectionProps) {
  if (loading) {
    return (
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Channel & Role Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <div className="neon-spinner mb-4" />
            <p className="text-sm text-muted-foreground">Loading channels and roles...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-purple-500/50 to-transparent" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
          </div>
          <div>
            <CardTitle>Channel & Role Filters</CardTitle>
            <CardDescription>Control which channels and users earn XP</CardDescription>
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
                Leave empty to allow all channels
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
          <div className="border border-border/50 rounded-lg bg-muted/20 p-3 max-h-48 overflow-y-auto space-y-1">
            {channels.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 px-2">No channels available</p>
            ) : (
              <>
                <label className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={config.allowedChannels.length === 0}
                    onChange={() => onChange((prev) => ({ ...prev, allowedChannels: [] }))}
                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2"
                  />
                  <span className="text-sm font-medium text-foreground">
                    All Channels (Default)
                  </span>
                </label>
                <div className="border-t border-border/30 my-2" />
                {channels.map((channel) => (
                  <label
                    key={channel.id}
                    className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={config.allowedChannels.includes(channel.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          onChange((prev) => ({
                            ...prev,
                            allowedChannels: [...prev.allowedChannels, channel.id],
                          }));
                        } else {
                          onChange((prev) => ({
                            ...prev,
                            allowedChannels: prev.allowedChannels.filter(
                              (id) => id !== channel.id
                            ),
                          }));
                        }
                      }}
                      className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2"
                    />
                    <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                    </svg>
                    <span className="text-sm text-muted-foreground">{channel.name}</span>
                  </label>
                ))}
              </>
            )}
          </div>
          {config.allowedChannels.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {config.allowedChannels.length} channel(s) selected
            </p>
          )}
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
                Users won't earn XP in these channels
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
          <div className="border border-border/50 rounded-lg bg-muted/20 p-3 max-h-48 overflow-y-auto space-y-1">
            {channels.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 px-2">No channels available</p>
            ) : (
              channels.map((channel) => (
                <label
                  key={channel.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={config.ignoredChannels.includes(channel.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange((prev) => ({
                          ...prev,
                          ignoredChannels: [...prev.ignoredChannels, channel.id],
                        }));
                      } else {
                        onChange((prev) => ({
                          ...prev,
                          ignoredChannels: prev.ignoredChannels.filter(
                            (id) => id !== channel.id
                          ),
                        }));
                      }
                    }}
                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2"
                  />
                  <svg className="w-4 h-4 text-muted-foreground flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                  </svg>
                  <span className="text-sm text-muted-foreground">{channel.name}</span>
                </label>
              ))
            )}
          </div>
          {config.ignoredChannels.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {config.ignoredChannels.length} channel(s) ignored
            </p>
          )}
        </div>

        <div className="border-t border-border/30" />

        {/* Ignored Roles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="block text-sm font-medium text-foreground">
                Ignored Roles
              </label>
              <p className="text-xs text-muted-foreground">
                Users with these roles won't earn XP
              </p>
            </div>
            {config.ignoredRoles.length > 0 && (
              <button
                type="button"
                onClick={() => onChange((prev) => ({ ...prev, ignoredRoles: [] }))}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
          <div className="border border-border/50 rounded-lg bg-muted/20 p-3 max-h-48 overflow-y-auto space-y-1">
            {roles.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 px-2">No roles available</p>
            ) : (
              roles.map((role) => (
                <label
                  key={role.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={config.ignoredRoles.includes(role.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange((prev) => ({
                          ...prev,
                          ignoredRoles: [...prev.ignoredRoles, role.id],
                        }));
                      } else {
                        onChange((prev) => ({
                          ...prev,
                          ignoredRoles: prev.ignoredRoles.filter((id) => id !== role.id),
                        }));
                      }
                    }}
                    className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary focus:ring-offset-0 focus:ring-2"
                  />
                  <div className="flex items-center gap-2">
                    {role.color && role.color > 0 && (
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: `#${role.color.toString(16).padStart(6, '0')}`,
                        }}
                      />
                    )}
                    <span className="text-sm text-muted-foreground">{role.name}</span>
                  </div>
                </label>
              ))
            )}
          </div>
          {config.ignoredRoles.length > 0 && (
            <p className="text-xs text-muted-foreground">
              {config.ignoredRoles.length} role(s) ignored
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
