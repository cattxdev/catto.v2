'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { RewardFormState, XpType, RewardType, Role, Channel } from './types';
import { SUPPORTED_REWARD_TYPES, DISCORD_PERMISSIONS, ROLE_REWARD_TYPES } from './constants';

interface RewardFormProps {
  form: RewardFormState;
  onChange: (updater: (prev: RewardFormState) => RewardFormState) => void;
  onSubmit: () => void;
  onCancel: () => void;
  roles: Role[];
  textChannels: Channel[];
  loadingRoles: boolean;
  saving: boolean;
  isValid: boolean;
  mode: 'create' | 'edit';
}

export function RewardForm({
  form,
  onChange,
  onSubmit,
  onCancel,
  roles,
  textChannels,
  loadingRoles,
  saving,
  isValid,
  mode,
}: RewardFormProps) {
  const isRoleReward = ROLE_REWARD_TYPES.includes(form.rewardType);

  const FormSection = ({ title, children, icon }: { title: string; children: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 pb-2 border-b border-border/30">
        {icon && <span className="text-muted-foreground">{icon}</span>}
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</h3>
      </div>
      {children}
    </div>
  );

  return (
    <Card variant="glass" className={`overflow-hidden ${mode === 'edit' ? 'border-primary/30' : ''}`}>
      {/* Header with accent */}
      <div className={`h-1 ${mode === 'edit' ? 'bg-gradient-to-r from-primary to-primary/30' : 'bg-gradient-to-r from-foreground/30 to-transparent'}`} />
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${mode === 'edit' ? 'bg-primary/10' : 'bg-muted/50'}`}>
            {mode === 'create' ? (
              <svg className="w-5 h-5 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            )}
          </div>
          <div>
            <CardTitle className="text-lg">{mode === 'create' ? 'Add New Reward' : 'Edit Reward'}</CardTitle>
            <CardDescription>{mode === 'create' ? 'Configure a new level reward' : 'Modify reward settings'}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Basic Settings */}
        <FormSection 
          title="Basic Settings"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Reward Name */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-foreground mb-2">Reward Name *</label>
              <Input
                value={form.name}
                onChange={(e) => onChange((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Member Role, VIP Access"
                className="text-base"
              />
            </div>

            {/* Level Required */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">Level Required</label>
              <div className="relative">
                <Input
                  type="number"
                  value={form.level}
                  onChange={(e) => onChange((prev) => ({ ...prev, level: parseInt(e.target.value) || 1 }))}
                  min="1"
                  max="1000"
                  className="pr-12"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">LVL</span>
              </div>
            </div>

            {/* XP Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">XP Type</label>
              <div className="grid grid-cols-3 gap-2">
                {(['TEXT', 'VOICE', 'BOTH'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => onChange((prev) => ({ ...prev, xpType: type }))}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      form.xpType === type
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted/30 text-muted-foreground hover:bg-muted/50'
                    }`}
                  >
                    {type === 'TEXT' && '💬 '}
                    {type === 'VOICE' && '🎙️ '}
                    {type === 'BOTH' && '✨ '}
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </FormSection>

        {/* Reward Type */}
        <FormSection 
          title="Reward Type"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" /></svg>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {SUPPORTED_REWARD_TYPES.map((type) => (
              <button
                key={type.value}
                type="button"
                onClick={() => onChange((prev) => ({
                  ...prev,
                  rewardType: type.value as RewardType,
                  roleId: '',
                  removeRoleIds: [],
                  channelIds: [],
                  permissions: [],
                  message: '',
                }))}
                className={`p-3 rounded-lg text-left transition-all border ${
                  form.rewardType === type.value
                    ? 'bg-muted/40 border-foreground/30 ring-1 ring-foreground/10'
                    : 'bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50'
                }`}
              >
                <span className="text-sm font-medium" style={{ color: 'hsl(var(--foreground))' }}>
                  {type.label}
                </span>
                <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'hsl(var(--muted-foreground))' }}>{type.description}</p>
              </button>
            ))}
          </div>
        </FormSection>

        {/* Type-specific configuration */}
        <FormSection 
          title="Configuration"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>}
        >
          <div className="grid grid-cols-1 gap-4">
            {/* Role-based reward fields */}
            {isRoleReward && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  {form.rewardType === 'ROLE_REMOVE' ? 'Role to Remove' : 'Role to Award'} *
                </label>
                <select
                  value={form.roleId}
                  onChange={(e) => onChange((prev) => ({ ...prev, roleId: e.target.value }))}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  disabled={loadingRoles}
                >
                  <option value="">Select a role...</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* ROLE_REPLACE: roles to remove */}
            {form.rewardType === 'ROLE_REPLACE' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Roles to Remove
                </label>
                <div className="border border-border/50 rounded-lg bg-muted/20 p-3 max-h-40 overflow-y-auto space-y-1">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.removeRoleIds.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange((prev) => ({
                              ...prev,
                              removeRoleIds: [...prev.removeRoleIds, role.id],
                            }));
                          } else {
                            onChange((prev) => ({
                              ...prev,
                              removeRoleIds: prev.removeRoleIds.filter((id) => id !== role.id),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{role.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {form.removeRoleIds.length} role(s) selected to remove
                </p>
              </div>
            )}

            {/* PERMISSION_GRANT fields */}
            {form.rewardType === 'PERMISSION_GRANT' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Permissions to Grant
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 border border-border/50 rounded-lg bg-muted/20 p-3">
                  {DISCORD_PERMISSIONS.map((perm) => (
                    <label
                      key={perm.value}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.permissions.includes(perm.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange((prev) => ({
                              ...prev,
                              permissions: [...prev.permissions, perm.value],
                            }));
                          } else {
                            onChange((prev) => ({
                              ...prev,
                              permissions: prev.permissions.filter((p) => p !== perm.value),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-foreground">{perm.label}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {form.permissions.length} permission(s) selected
                </p>
              </div>
            )}

            {/* CHANNEL_ACCESS fields */}
            {form.rewardType === 'CHANNEL_ACCESS' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Channels to Grant Access
                </label>
                <div className="border border-border/50 rounded-lg bg-muted/20 p-3 max-h-48 overflow-y-auto space-y-1">
                  {textChannels.map((channel) => (
                    <label
                      key={channel.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/30 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={form.channelIds.includes(channel.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            onChange((prev) => ({
                              ...prev,
                              channelIds: [...prev.channelIds, channel.id],
                            }));
                          } else {
                            onChange((prev) => ({
                              ...prev,
                              channelIds: prev.channelIds.filter((id) => id !== channel.id),
                            }));
                          }
                        }}
                        className="w-4 h-4 rounded border-border bg-muted text-primary focus:ring-primary"
                      />
                      <span className="text-sm text-muted-foreground"># {channel.name}</span>
                    </label>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {form.channelIds.length} channel(s) selected
                </p>
              </div>
            )}

            {/* ANNOUNCEMENT fields */}
            {form.rewardType === 'ANNOUNCEMENT' && (
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Announcement Message
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => onChange((prev) => ({ ...prev, message: e.target.value }))}
                  placeholder="Congratulations {user}! You've reached level {level}!"
                  rows={3}
                  className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Available variables: {'{user}'}, {'{level}'}, {'{reward}'}
                </p>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Description (Optional)
              </label>
              <Input
                value={form.description}
                onChange={(e) => onChange((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Awarded for reaching level..."
              />
            </div>
          </div>
        </FormSection>

        {/* Options Section */}
        <FormSection 
          title="Options"
          icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">Stackable</span>
                  <p className="text-xs text-muted-foreground">Can be combined with other rewards</p>
                </div>
              </div>
              <Switch
                checked={form.stackable}
                onCheckedChange={(checked) => onChange((prev) => ({ ...prev, stackable: checked }))}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <div>
                  <span className="text-sm font-medium text-foreground">One-time only</span>
                  <p className="text-xs text-muted-foreground">Award once per user</p>
                </div>
              </div>
              <Switch
                checked={form.oneTime}
                onCheckedChange={(checked) => onChange((prev) => ({ ...prev, oneTime: checked }))}
              />
            </div>
          </div>
        </FormSection>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
          <Button variant="outline" onClick={onCancel} className="px-6">
            Cancel
          </Button>
          <Button variant="neon" onClick={onSubmit} disabled={saving || !isValid} className="px-6">
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                {mode === 'create' ? 'Creating...' : 'Saving...'}
              </span>
            ) : (
              mode === 'create' ? 'Create Reward' : 'Save Changes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
