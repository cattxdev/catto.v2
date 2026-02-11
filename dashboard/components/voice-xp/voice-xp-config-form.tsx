'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useGuildData } from '@/hooks/use-guild-data';
import type { VoiceXPConfig } from '@/lib/services/voice-xp.service';
import { voiceXPService } from '@/lib/services/voice-xp.service';

import { PageHeader } from './page-header';
import { StatusAlerts } from './status-alerts';
import { GeneralSettings } from './general-settings';
import { XpAwardSettings } from './xp-award-settings';
import { UserStateFilters } from './user-state-filters';
import { ChannelFilters } from './channel-filters';
import { RoleFilters } from './role-filters';
import { LevelUpAnnouncements } from './level-up-announcements';
import { LevelCurveConfig } from './level-curve-config';
import { SaveFooter } from './save-footer';
import type { VoiceXPFormProps } from './types';

export function VoiceXPConfigForm({ guildId, initialConfig }: VoiceXPFormProps) {
  const router = useRouter();
  const [config, setConfig] = useState<VoiceXPConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { voiceChannels, textChannels, roles, loading: isLoadingData } = useGuildData(guildId);

  const handleChange = (updater: (prev: VoiceXPConfig) => VoiceXPConfig) => {
    setConfig(updater);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await voiceXPService.updateConfig(guildId, config);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PageHeader
        title="Voice XP Configuration"
        description="Configure how users earn XP from voice channels"
      />

      <StatusAlerts error={error} success={success} />

      <GeneralSettings config={config} onChange={handleChange} />

      <XpAwardSettings config={config} onChange={handleChange} />

      <UserStateFilters config={config} onChange={handleChange} />

      <ChannelFilters
        config={config}
        onChange={handleChange}
        voiceChannels={voiceChannels}
        textChannels={textChannels}
        loading={isLoadingData}
      />

      <RoleFilters
        config={config}
        onChange={handleChange}
        roles={roles}
        loading={isLoadingData}
      />

      <LevelUpAnnouncements
        config={config}
        onChange={handleChange}
        voiceChannels={voiceChannels}
        textChannels={textChannels}
        loading={isLoadingData}
      />

      <LevelCurveConfig config={config} onChange={handleChange} />

      <SaveFooter saving={isSaving} />
    </form>
  );
}
