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

  return (
    <Card variant="glass" className={mode === 'edit' ? 'border-primary/50' : undefined}>
      <CardHeader>
        <CardTitle>{mode === 'create' ? 'Add New Reward' : 'Edit Reward'}</CardTitle>
        <CardDescription>
          {mode === 'create' ? 'Create a new level reward' : 'Modify reward settings'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Level Required */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Level Required
            </label>
            <Input
              type="number"
              value={form.level}
              onChange={(e) =>
                onChange((prev) => ({ ...prev, level: parseInt(e.target.value) || 1 }))
              }
              min="1"
              max="1000"
            />
          </div>

          {/* XP Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">XP Type</label>
            <select
              value={form.xpType}
              onChange={(e) => onChange((prev) => ({ ...prev, xpType: e.target.value as XpType }))}
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <option value="TEXT">Text XP</option>
              <option value="VOICE">Voice XP</option>
              <option value="BOTH">Both</option>
            </select>
          </div>

          {/* Reward Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Reward Name</label>
            <Input
              value={form.name}
              onChange={(e) => onChange((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Member Role"
            />
          </div>

          {/* Reward Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Reward Type</label>
            <select
              value={form.rewardType}
              onChange={(e) =>
                onChange((prev) => ({
                  ...prev,
                  rewardType: e.target.value as RewardType,
                  roleId: '',
                  removeRoleIds: [],
                  channelIds: [],
                  permissions: [],
                  message: '',
                }))
              }
              className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {SUPPORTED_REWARD_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              {SUPPORTED_REWARD_TYPES.find((t) => t.value === form.rewardType)?.description}
            </p>
          </div>

          {/* Role-based reward fields */}
          {isRoleReward && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {form.rewardType === 'ROLE_REMOVE' ? 'Role to Remove' : 'Role to Award'}
              </label>
              <select
                value={form.roleId}
                onChange={(e) => onChange((prev) => ({ ...prev, roleId: e.target.value }))}
                className="w-full px-4 py-2 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={loadingRoles}
              >
                <option value="">Select a role...</option>
                {roles.map((role) => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
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
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
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
            <div className="md:col-span-2">
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
          <div className="md:col-span-2">
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

        {/* Switches */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Switch
              checked={form.stackable}
              onCheckedChange={(checked) => onChange((prev) => ({ ...prev, stackable: checked }))}
            />
            <label className="text-sm text-foreground">Stackable</label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={form.oneTime}
              onCheckedChange={(checked) => onChange((prev) => ({ ...prev, oneTime: checked }))}
            />
            <label className="text-sm text-foreground">One-time only</label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-border/50">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="neon" onClick={onSubmit} disabled={saving || !isValid}>
            {saving
              ? mode === 'create'
                ? 'Creating...'
                : 'Saving...'
              : mode === 'create'
                ? 'Create Reward'
                : 'Save Changes'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
