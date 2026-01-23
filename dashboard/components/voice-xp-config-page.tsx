"use client"

import VoiceXPConfigForm from "@/components/voice-xp-config-form"
import { useVoiceXPConfig } from "@/hooks/use-voice-xp-config"

interface VoiceXPConfigPageProps {
  guildId: string;
}

export default function VoiceXPConfigPage({ guildId }: VoiceXPConfigPageProps) {
  const { config, loading, error } = useVoiceXPConfig(guildId);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#5865F2] mx-auto"></div>
        <p className="text-gray-600 mt-4">Loading configuration...</p>
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
        <div className="text-red-500 mb-4">
          <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Configuration</h2>
        <p className="text-gray-600">{error || 'Unable to fetch the Voice XP configuration. Please try again later.'}</p>
      </div>
    );
  }

  return <VoiceXPConfigForm guildId={guildId} initialConfig={config} />;
}
