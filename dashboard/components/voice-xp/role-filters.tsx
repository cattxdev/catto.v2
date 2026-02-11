'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { RoleSectionProps } from './types';

export function RoleFilters({ config, onChange, roles, loading }: RoleSectionProps) {
  if (loading || roles.length === 0) return null;

  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-orange-500/50 to-transparent" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <CardTitle>Role Filters</CardTitle>
            <CardDescription>Exclude specific roles from earning voice XP</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <label className="block text-sm font-medium text-foreground">
              Ignored Roles
            </label>
            <p className="text-xs text-muted-foreground">
              Users with these roles won't gain voice XP
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
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-1">
          {roles.map((role) => {
            const isSelected = config.ignoredRoles.includes(role.id);
            const roleColor = role.color ? `#${role.color.toString(16).padStart(6, '0')}` : null;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => {
                  if (isSelected) {
                    onChange((prev) => ({
                      ...prev,
                      ignoredRoles: prev.ignoredRoles.filter((id) => id !== role.id),
                    }));
                  } else {
                    onChange((prev) => ({
                      ...prev,
                      ignoredRoles: [...prev.ignoredRoles, role.id],
                    }));
                  }
                }}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all border overflow-hidden ${
                  isSelected
                    ? 'bg-destructive/10 border-destructive/30 text-foreground'
                    : 'bg-muted/20 border-border/30 text-muted-foreground hover:bg-muted/40'
                }`}
              >
                {roleColor && (
                  <div 
                    className="absolute left-0 top-0 bottom-0 w-1"
                    style={{ backgroundColor: roleColor }}
                  />
                )}
                <div 
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: roleColor || 'hsl(var(--muted-foreground))' }}
                />
                <span className="truncate">{role.name}</span>
                {isSelected && (
                  <svg className="w-4 h-4 ml-auto flex-shrink-0 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
        <p className="text-xs text-muted-foreground">
          Ignored: {config.ignoredRoles.length} role{config.ignoredRoles.length !== 1 ? 's' : ''}
        </p>
      </CardContent>
    </Card>
  );
}
