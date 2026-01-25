'use client';

import { useState, useEffect } from 'react';
import { useTempVoiceConfig } from '@/hooks/use-temp-voice-config';
import { useGuildData } from '@/hooks/use-guild-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

interface TempVoiceConfigFormProps {
  guildId: string;
}

export default function TempVoiceConfigForm({ guildId }: TempVoiceConfigFormProps) {
  const {
    config,
    channels,
    stats,
    loading,
    saving,
    error,
    updateConfig,
    setup,
    addJoinChannel,
    removeJoinChannel,
    deleteConfig,
  } = useTempVoiceConfig(guildId);

  const { voiceChannels, loading: loadingChannels } = useGuildData(guildId);

  const [success, setSuccess] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Setup wizard state
  const [setupCategoryName, setSetupCategoryName] = useState('Temp Voice');
  const [setupJoinChannelName, setSetupJoinChannelName] = useState('Join to Create');
  const [isSettingUp, setIsSettingUp] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  // Local config state for editing
  const [localConfig, setLocalConfig] = useState({
    namingScheme: config?.namingScheme || 'username',
    customNamingPattern: config?.customNamingPattern || "{username}'s Channel",
    userLimit: config?.userLimit || null,
    bitrate: config?.bitrate || null,
    autoDeleteEmpty: config?.autoDeleteEmpty ?? true,
    deleteEmptyAfterMs: config?.deleteEmptyAfterMs || 60000,
    autoDeleteOwnerLeave: config?.autoDeleteOwnerLeave ?? false,
    deleteOwnerLeaveAfterMs: config?.deleteOwnerLeaveAfterMs || 300000,
    allowOwnerTransfer: config?.allowOwnerTransfer ?? true,
    allowOwnerManagement: config?.allowOwnerManagement ?? true,
    maxChannelsPerUser: config?.maxChannelsPerUser || 1,
  });

  // Sync localConfig when config changes (e.g., after setup)
  useEffect(() => {
    if (config) {
      setLocalConfig({
        namingScheme: config.namingScheme || 'username',
        customNamingPattern: config.customNamingPattern || "{username}'s Channel",
        userLimit: config.userLimit || null,
        bitrate: config.bitrate || null,
        autoDeleteEmpty: config.autoDeleteEmpty ?? true,
        deleteEmptyAfterMs: config.deleteEmptyAfterMs || 60000,
        autoDeleteOwnerLeave: config.autoDeleteOwnerLeave ?? false,
        deleteOwnerLeaveAfterMs: config.deleteOwnerLeaveAfterMs || 300000,
        allowOwnerTransfer: config.allowOwnerTransfer ?? true,
        allowOwnerManagement: config.allowOwnerManagement ?? true,
        maxChannelsPerUser: config.maxChannelsPerUser || 1,
      });
    }
  }, [config]);

  const handleSetup = async () => {
    setIsSettingUp(true);
    setSetupError(null);
    try {
      const result = await setup({
        categoryName: setupCategoryName,
        joinChannelName: setupJoinChannelName,
      });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        // Hook already updates the config state, no refresh needed
      } else {
        setSetupError(result.error || 'Setup failed');
      }
    } catch (err) {
      setSetupError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleToggleEnabled = async (enabled: boolean) => {
    const result = await updateConfig({ enabled });
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleSaveConfig = async () => {
    const result = await updateConfig({
      namingScheme: localConfig.namingScheme as 'username' | 'custom',
      customNamingPattern: localConfig.customNamingPattern,
      userLimit: localConfig.userLimit,
      bitrate: localConfig.bitrate,
      autoDeleteEmpty: localConfig.autoDeleteEmpty,
      deleteEmptyAfterMs: localConfig.deleteEmptyAfterMs,
      autoDeleteOwnerLeave: localConfig.autoDeleteOwnerLeave,
      deleteOwnerLeaveAfterMs: localConfig.deleteOwnerLeaveAfterMs,
      allowOwnerTransfer: localConfig.allowOwnerTransfer,
      allowOwnerManagement: localConfig.allowOwnerManagement,
      maxChannelsPerUser: localConfig.maxChannelsPerUser,
    });
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleAddJoinChannel = async (channelId: string) => {
    const result = await addJoinChannel(channelId);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleRemoveJoinChannel = async (channelId: string) => {
    const result = await removeJoinChannel(channelId);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  const handleDelete = async () => {
    const result = await deleteConfig();
    if (result.success) {
      setConfirmDelete(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted/50 rounded w-1/3 mb-2" />
          <div className="h-4 bg-muted/30 rounded w-1/2" />
        </div>
        <Card variant="glass">
          <CardContent className="py-12">
            <div className="flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-muted-foreground">Loading temp voice configuration...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Not configured - show setup wizard
  if (!config) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Temporary Voice Channels</h2>
          <p className="text-muted-foreground mt-1">
            Let users create their own temporary voice channels
          </p>
        </div>

        {/* Show API errors */}
        {error && (
          <div className="glass border-destructive/50 rounded-lg p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-destructive">Error Loading Config</h3>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        )}

        {setupError && (
          <div className="glass border-destructive/50 rounded-lg p-4 flex items-start gap-3">
            <svg
              className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-medium text-destructive">Setup Error</h3>
              <p className="text-sm text-destructive/80 mt-1">{setupError}</p>
            </div>
          </div>
        )}

        <Card variant="glass">
          <CardHeader>
            <CardTitle>Setup Temporary Voice</CardTitle>
            <CardDescription>
              Create a "Join to Create" voice channel. When users join it, a new temporary channel
              is created for them.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category Name
                </label>
                <Input
                  value={setupCategoryName}
                  onChange={(e) => setSetupCategoryName(e.target.value)}
                  placeholder="Temp Voice"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Category to organize temp voice channels
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Join Channel Name
                </label>
                <Input
                  value={setupJoinChannelName}
                  onChange={(e) => setSetupJoinChannelName(e.target.value)}
                  placeholder="Join to Create"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Channel users join to create their own
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <p className="text-sm text-muted-foreground mb-4">
                This will create a category, a "Join to Create" voice channel, and an admin-only log
                channel with a webhook for logging events.
              </p>
              <Button variant="neon" onClick={handleSetup} disabled={isSettingUp}>
                {isSettingUp ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Setting up...
                  </>
                ) : (
                  'Setup Temp Voice'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Temporary Voice Channels</h2>
          <p className="text-muted-foreground mt-1">
            Let users create their own temporary voice channels
          </p>
        </div>
        <Button variant="neon" onClick={handleSaveConfig} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="glass border-destructive/50 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-destructive">Error</h3>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="glass border-success/50 rounded-lg p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-success flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-success">Success</h3>
            <p className="text-sm text-success/80 mt-1">Configuration saved successfully!</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card variant="glass">
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-primary">{stats.stats.activeChannels}</div>
              <div className="text-sm text-muted-foreground">Active Channels</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-primary">
                {stats.stats.totalChannelsCreated}
              </div>
              <div className="text-sm text-muted-foreground">Total Created</div>
            </CardContent>
          </Card>
          <Card variant="glass">
            <CardContent className="py-4">
              <div className="text-2xl font-bold text-primary">{stats.stats.totalMembers}</div>
              <div className="text-sm text-muted-foreground">Total Members</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* General Settings */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>General Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <label className="text-sm font-medium text-foreground">
                Enable Temp Voice System
              </label>
              <p className="text-sm text-muted-foreground">
                Master toggle for temporary voice channels
              </p>
            </div>
            <Switch
              checked={config.enabled}
              onCheckedChange={handleToggleEnabled}
              disabled={saving}
            />
          </div>
        </CardContent>
      </Card>

      {/* Join Channels */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Join Channels</CardTitle>
          <CardDescription>
            Voice channels that create temp channels when users join
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {config.joinChannelIds.length > 0 ? (
            <div className="space-y-2">
              {config.joinChannelIds.map((channelId) => {
                const channel = voiceChannels.find((c) => c.id === channelId);
                return (
                  <div
                    key={channelId}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30"
                  >
                    <span className="text-sm text-foreground">{channel?.name || channelId}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveJoinChannel(channelId)}
                      disabled={saving}
                    >
                      Remove
                    </Button>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-2">No join channels configured</p>
          )}

          {!loadingChannels && voiceChannels.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Add Join Channel
              </label>
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    handleAddJoinChannel(e.target.value);
                    e.target.value = '';
                  }
                }}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={saving}
              >
                <option value="">Select a voice channel...</option>
                {voiceChannels
                  .filter((c) => !config.joinChannelIds.includes(c.id))
                  .map((channel) => (
                    <option key={channel.id} value={channel.id}>
                      {channel.name}
                    </option>
                  ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Naming Settings */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Channel Naming</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Naming Scheme</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setLocalConfig((prev) => ({ ...prev, namingScheme: 'username' }))}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                  localConfig.namingScheme === 'username'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                }`}
              >
                <div className="font-medium">Username</div>
                <div className="text-xs opacity-75">Use the creator's username</div>
              </button>
              <button
                type="button"
                onClick={() => setLocalConfig((prev) => ({ ...prev, namingScheme: 'custom' }))}
                className={`px-4 py-3 rounded-lg border-2 transition-all text-left ${
                  localConfig.namingScheme === 'custom'
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-border/80 hover:bg-muted/30'
                }`}
              >
                <div className="font-medium">Custom Pattern</div>
                <div className="text-xs opacity-75">Use a custom naming pattern</div>
              </button>
            </div>
          </div>

          {localConfig.namingScheme === 'custom' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Custom Pattern
              </label>
              <Input
                value={localConfig.customNamingPattern || ''}
                onChange={(e) =>
                  setLocalConfig((prev) => ({ ...prev, customNamingPattern: e.target.value }))
                }
                placeholder="{username}'s Channel"
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Variables: {'{username}'}, {'{userid}'}, {'{count}'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Channel Settings */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Channel Defaults</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">User Limit</label>
              <Input
                type="number"
                value={localConfig.userLimit || ''}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    userLimit: e.target.value ? parseInt(e.target.value) : null,
                  }))
                }
                placeholder="No limit"
                min="0"
                max="99"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Max users (0 = unlimited)</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Bitrate (kbps)
              </label>
              <Input
                type="number"
                value={localConfig.bitrate ? localConfig.bitrate / 1000 : ''}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    bitrate: e.target.value ? parseInt(e.target.value) * 1000 : null,
                  }))
                }
                placeholder="Server default"
                min="8"
                max="384"
              />
              <p className="text-xs text-muted-foreground mt-1.5">Audio quality</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Max Channels Per User
              </label>
              <Input
                type="number"
                value={localConfig.maxChannelsPerUser}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    maxChannelsPerUser: parseInt(e.target.value) || 1,
                  }))
                }
                min="1"
                max="10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Delete Settings */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Auto-Delete Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <label className="text-sm font-medium text-foreground">Delete When Empty</label>
              <p className="text-sm text-muted-foreground">Remove channel when all users leave</p>
            </div>
            <Switch
              checked={localConfig.autoDeleteEmpty}
              onCheckedChange={(checked) =>
                setLocalConfig((prev) => ({ ...prev, autoDeleteEmpty: checked }))
              }
            />
          </div>

          {localConfig.autoDeleteEmpty && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Delay Before Delete (seconds)
              </label>
              <Input
                type="number"
                value={localConfig.deleteEmptyAfterMs / 1000}
                onChange={(e) =>
                  setLocalConfig((prev) => ({
                    ...prev,
                    deleteEmptyAfterMs: (parseInt(e.target.value) || 0) * 1000,
                  }))
                }
                min="0"
                max="3600"
              />
            </div>
          )}

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <label className="text-sm font-medium text-foreground">
                Delete When Owner Leaves
              </label>
              <p className="text-sm text-muted-foreground">
                Remove channel when the creator leaves
              </p>
            </div>
            <Switch
              checked={localConfig.autoDeleteOwnerLeave}
              onCheckedChange={(checked) =>
                setLocalConfig((prev) => ({ ...prev, autoDeleteOwnerLeave: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Owner Permissions */}
      <Card variant="glass">
        <CardHeader>
          <CardTitle>Owner Permissions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <label className="text-sm font-medium text-foreground">Allow Owner Transfer</label>
              <p className="text-sm text-muted-foreground">
                Let owners transfer ownership to others
              </p>
            </div>
            <Switch
              checked={localConfig.allowOwnerTransfer}
              onCheckedChange={(checked) =>
                setLocalConfig((prev) => ({ ...prev, allowOwnerTransfer: checked }))
              }
            />
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/50">
            <div>
              <label className="text-sm font-medium text-foreground">Allow Owner Management</label>
              <p className="text-sm text-muted-foreground">Let owners rename, limit users, etc.</p>
            </div>
            <Switch
              checked={localConfig.allowOwnerManagement}
              onCheckedChange={(checked) =>
                setLocalConfig((prev) => ({ ...prev, allowOwnerManagement: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Channels */}
      {channels.length > 0 && (
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Active Channels ({channels.length})</CardTitle>
            <CardDescription>Currently active temporary voice channels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {channels.map((channel) => (
                <div
                  key={channel.channelId}
                  className="p-4 rounded-lg bg-muted/20 border border-border/30"
                >
                  {/* Channel Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-muted-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                        />
                      </svg>
                      <span className="text-sm font-medium text-foreground">
                        {channel.channelName || channel.channelId}
                      </span>
                      {channel.permissions?.isLocked && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                          Locked
                        </span>
                      )}
                      {channel.permissions?.isHidden && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                          Hidden
                        </span>
                      )}
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {channel.memberCount || 0}
                      {channel.userLimit ? `/${channel.userLimit}` : ''} users
                    </span>
                  </div>

                  {/* Channel Info */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                    <span>Owner: {channel.ownerUsername || channel.ownerId}</span>
                    {channel.categoryName && <span>Category: {channel.categoryName}</span>}
                    {channel.bitrate && <span>{Math.round(channel.bitrate / 1000)}kbps</span>}
                    <span>Created: {new Date(channel.createdAt).toLocaleString()}</span>
                  </div>

                  {/* Members List */}
                  {channel.members && channel.members.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-border/30">
                      <p className="text-xs text-muted-foreground mb-1">Members:</p>
                      <div className="flex flex-wrap gap-2">
                        {channel.members.map((member) => (
                          <div
                            key={member.id}
                            className="flex items-center gap-1.5 px-2 py-1 rounded bg-muted/30 text-xs"
                          >
                            {member.avatar ? (
                              <img
                                src={member.avatar}
                                alt={member.username}
                                className="w-4 h-4 rounded-full"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-full bg-primary/20" />
                            )}
                            <span className="text-foreground">
                              {member.displayName || member.username}
                            </span>
                            {member.id === channel.ownerId && (
                              <span className="text-primary text-[10px]">(owner)</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card variant="glass" className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>Irreversible actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
            <div>
              <p className="text-sm font-medium text-foreground">Delete Temp Voice System</p>
              <p className="text-sm text-muted-foreground">
                Remove configuration and all active channels
              </p>
            </div>
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button variant="destructive" size="sm" onClick={handleDelete} disabled={saving}>
                  {saving ? 'Deleting...' : 'Confirm Delete'}
                </Button>
              </div>
            ) : (
              <Button variant="destructive" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
