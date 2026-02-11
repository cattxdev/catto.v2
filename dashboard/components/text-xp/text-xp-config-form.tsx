'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import type { XPConfig } from './types';
import { PageHeader } from './page-header';
import { StatusAlerts } from './status-alerts';
import { GeneralSettings } from './general-settings';
import { XpAwardSettings } from './xp-award-settings';
import { ChannelRoleFilters } from './channel-role-filters';
import { LevelUpAnnouncements } from './level-up-announcements';
import { LevelCurveConfig } from './level-curve-config';
import { SaveFooter } from './save-footer';
import { textXPService } from '@/lib/services/text-xp.service';

interface TextXPConfigFormProps {
  guildId: string;
  initialConfig: XPConfig;
  textChannels: { id: string; name: string; type?: string | number }[];
  roles: { id: string; name: string; color: number }[];
}

export function TextXPConfigForm({ guildId, initialConfig, textChannels, roles }: TextXPConfigFormProps) {
  const router = useRouter();
  const [config, setConfig] = useState<XPConfig>(initialConfig);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await textXPService.updateConfig(guildId, config);
      setSuccess(true);
      router.refresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving text XP config:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PageHeader title="Text XP Configuration" description="Configure how users earn XP from messages in your server" />
      
      <StatusAlerts error={error} success={success} />
      
      <GeneralSettings config={config} onChange={setConfig} />
      
      <XpAwardSettings config={config} onChange={setConfig} />
      
      <ChannelRoleFilters 
        config={config} 
        onChange={setConfig} 
        channels={textChannels}
        roles={roles}
        loading={loading}
      />
      
      <LevelUpAnnouncements 
        config={config} 
        onChange={setConfig} 
        textChannels={textChannels}
        loading={loading}
      />
      
      <LevelCurveConfig config={config} onChange={setConfig} />
      
      <SaveFooter saving={saving} />
    </form>
  );
}
