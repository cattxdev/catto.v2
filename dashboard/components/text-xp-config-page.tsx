"use client"

import XPConfigForm from "@/components/xp-config-form"
import { useTextXPConfig } from "@/hooks/use-text-xp-config"

interface TextXPConfigPageProps {
  guildId: string;
}

export default function TextXPConfigPage({ guildId }: TextXPConfigPageProps) {
  const { config, loading, error } = useTextXPConfig(guildId);

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
        <p className="text-gray-600">{error || 'Unable to fetch the XP configuration. Please try again later.'}</p>
      </div>
    );
  }

  return <XPConfigForm guildId={guildId} initialConfig={config} />;
}
