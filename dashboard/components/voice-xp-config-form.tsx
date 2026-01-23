"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useGuildData } from "@/hooks/use-guild-data"
import type { VoiceXPConfig } from "@/lib/services/voice-xp.service"
import { voiceXPService } from "@/lib/services/voice-xp.service"

interface VoiceXPConfigFormProps {
  guildId: string;
  initialConfig: VoiceXPConfig;
}

export default function VoiceXPConfigForm({ guildId, initialConfig }: VoiceXPConfigFormProps) {
  const router = useRouter();
  const [config, setConfig] = useState<VoiceXPConfig>(initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const { voiceChannels, textChannels, roles, loading: isLoadingData } = useGuildData(guildId);

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
      {/* Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-red-800">Error</h3>
            <p className="text-sm text-red-700 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start space-x-3">
          <svg className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-green-800">Success</h3>
            <p className="text-sm text-green-700 mt-1">Configuration saved successfully!</p>
          </div>
        </div>
      )}

      {/* General Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">General Settings</h2>
        
        <div className="space-y-4">
          {/* Enabled Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Enable Voice XP System</label>
              <p className="text-sm text-gray-500">Allow users to gain XP from voice channels</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.enabled ? 'bg-[#5865F2]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* XP Award Settings */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">XP Award Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* XP Per Minute */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              XP Per Minute
            </label>
            <input
              type="number"
              value={config.xpPerMinute}
              onChange={(e) => setConfig(prev => ({ ...prev, xpPerMinute: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
              min="0"
              max="1000"
            />
            <p className="text-xs text-gray-500 mt-1">XP awarded per minute in voice</p>
          </div>

          {/* Min Session Minutes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Session Duration (minutes)
            </label>
            <input
              type="number"
              value={config.minSessionMinutes}
              onChange={(e) => setConfig(prev => ({ ...prev, minSessionMinutes: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
              min="0"
              max="60"
            />
            <p className="text-xs text-gray-500 mt-1">Minimum time before XP is awarded</p>
          </div>

          {/* XP Mode */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              XP Award Mode
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, xpMode: 'PER_MINUTE' }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  config.xpMode === 'PER_MINUTE'
                    ? 'border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Per Minute</div>
                <div className="text-xs opacity-75">Award XP every minute</div>
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, xpMode: 'PER_SESSION' }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  config.xpMode === 'PER_SESSION'
                    ? 'border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Per Session</div>
                <div className="text-xs opacity-75">Award XP when session ends</div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* User State Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">User State Filters</h2>
        <p className="text-sm text-gray-500 mb-4">Configure which user states should earn XP</p>
        
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Award XP While Muted</label>
              <p className="text-xs text-gray-500">Allow XP gain when user is muted</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, awardMuted: !prev.awardMuted }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.awardMuted ? 'bg-[#5865F2]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.awardMuted ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Award XP While Deafened</label>
              <p className="text-xs text-gray-500">Allow XP gain when user is deafened</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, awardDeafened: !prev.awardDeafened }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.awardDeafened ? 'bg-[#5865F2]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.awardDeafened ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Award XP While Streaming</label>
              <p className="text-xs text-gray-500">Give XP when user is screen sharing</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, awardStreaming: !prev.awardStreaming }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.awardStreaming ? 'bg-[#5865F2]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.awardStreaming ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Award XP With Video On</label>
              <p className="text-xs text-gray-500">Give XP when user has video enabled</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, awardVideo: !prev.awardVideo }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.awardVideo ? 'bg-[#5865F2]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.awardVideo ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Ignore AFK Channel</label>
              <p className="text-xs text-gray-500">Don't award XP in the AFK channel</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, ignoreAfkChannel: !prev.ignoreAfkChannel }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.ignoreAfkChannel ? 'bg-[#5865F2]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.ignoreAfkChannel ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Channel Filters */}
      {!isLoadingData && voiceChannels.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Channel Filters</h2>
          
          <div className="space-y-4">
            {/* Allowed Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Channels (Optional)
              </label>
              <p className="text-xs text-gray-500 mb-2">
                If set, only these channels will award XP
              </p>
              <select
                multiple
                value={config.allowedChannels}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setConfig(prev => ({ ...prev, allowedChannels: selected }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent h-32"
              >
                {voiceChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    # {channel.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple. Selected: {config.allowedChannels.length}
              </p>
            </div>

            {/* Ignored Channels */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ignored Channels
              </label>
              <p className="text-xs text-gray-500 mb-2">
                These channels will never award XP
              </p>
              <select
                multiple
                value={config.ignoredChannels}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setConfig(prev => ({ ...prev, ignoredChannels: selected }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent h-32"
              >
                {voiceChannels.map(channel => (
                  <option key={channel.id} value={channel.id}>
                    # {channel.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Hold Ctrl/Cmd to select multiple. Selected: {config.ignoredChannels.length}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Role Filters */}
      {!isLoadingData && roles.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Role Filters</h2>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ignored Roles
            </label>
            <p className="text-xs text-gray-500 mb-2">
              Users with these roles won't gain XP
            </p>
            <select
              multiple
              value={config.ignoredRoles}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                setConfig(prev => ({ ...prev, ignoredRoles: selected }));
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent h-32"
            >
              {roles.map(role => (
                <option key={role.id} value={role.id}>
                  @ {role.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              Hold Ctrl/Cmd to select multiple. Selected: {config.ignoredRoles.length}
            </p>
          </div>
        </div>
      )}

      {/* Level-Up Announcements */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Level-Up Announcements</h2>
        
        <div className="space-y-4">
          {/* Announce Toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">Announce Level-Ups</label>
              <p className="text-sm text-gray-500">Send a message when users level up</p>
            </div>
            <button
              type="button"
              onClick={() => setConfig(prev => ({ ...prev, announceLevelUp: !prev.announceLevelUp }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                config.announceLevelUp ? 'bg-[#5865F2]' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  config.announceLevelUp ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {config.announceLevelUp && (
            <>
              {/* Announce Channel */}
              {!isLoadingData && textChannels.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Announcement Channel (Optional)
                  </label>
                  <select
                    value={config.announceChannelId || ''}
                    onChange={(e) => setConfig(prev => ({ 
                      ...prev, 
                      announceChannelId: e.target.value || null 
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  >
                    <option value="">Current Channel</option>
                    {textChannels.map(channel => (
                      <option key={channel.id} value={channel.id}>
                        # {channel.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Leave as "Current Channel" to send in the same channel as the user
                  </p>
                </div>
              )}

              {/* Message Template */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Template
                </label>
                <textarea
                  value={config.messageTemplate}
                  onChange={(e) => setConfig(prev => ({ ...prev, messageTemplate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  rows={3}
                  placeholder="GG {user}, you just advanced to level {level}!"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Available variables: {'{user}'}, {'{level}'}, {'{xp}'}, {'{nextLevelXp}'}
                </p>
              </div>

              {/* Embed Settings */}
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Use Embed</label>
                  <p className="text-sm text-gray-500">Send as an embedded message</p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfig(prev => ({ ...prev, embedEnabled: !prev.embedEnabled }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    config.embedEnabled ? 'bg-[#5865F2]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      config.embedEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {config.embedEnabled && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Embed Color
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="color"
                      value={`#${config.embedColor.toString(16).padStart(6, '0')}`}
                      onChange={(e) => {
                        const hex = e.target.value.replace('#', '');
                        const decimal = parseInt(hex, 16);
                        setConfig(prev => ({ ...prev, embedColor: decimal }));
                      }}
                      className="w-16 h-10 border border-gray-300 rounded-md cursor-pointer"
                    />
                    <input
                      type="text"
                      value={`#${config.embedColor.toString(16).padStart(6, '0')}`}
                      onChange={(e) => {
                        const hex = e.target.value.replace('#', '');
                        if (/^[0-9A-Fa-f]{0,6}$/.test(hex)) {
                          const decimal = parseInt(hex || '0', 16);
                          setConfig(prev => ({ ...prev, embedColor: decimal }));
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent font-mono"
                      placeholder="#5865F2"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Level Curve Configuration */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Level Curve Configuration</h2>
        
        <div className="space-y-4">
          {/* Curve Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Level Curve Type
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, levelCurveType: 'FORMULA' }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  config.levelCurveType === 'FORMULA'
                    ? 'border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Formula</div>
                <div className="text-xs opacity-75">Use mathematical formula</div>
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, levelCurveType: 'TABLE' }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  config.levelCurveType === 'TABLE'
                    ? 'border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Table</div>
                <div className="text-xs opacity-75">Define XP thresholds</div>
              </button>
            </div>
          </div>

          {/* Formula Settings */}
          {config.levelCurveType === 'FORMULA' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base
                </label>
                <input
                  type="number"
                  value={config.formulaBase}
                  onChange={(e) => setConfig(prev => ({ ...prev, formulaBase: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exponent
                </label>
                <input
                  type="number"
                  value={config.formulaExponent}
                  onChange={(e) => setConfig(prev => ({ ...prev, formulaExponent: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  min="0"
                  step="0.1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offset
                </label>
                <input
                  type="number"
                  value={config.formulaOffset}
                  onChange={(e) => setConfig(prev => ({ ...prev, formulaOffset: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  min="0"
                  step="1"
                />
              </div>
              <div className="md:col-span-3">
                <p className="text-xs text-gray-500">
                  Formula: XP = base * (level ^ exponent) + offset
                </p>
              </div>
            </div>
          )}

          {/* Table Settings */}
          {config.levelCurveType === 'TABLE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                XP Thresholds (comma-separated)
              </label>
              <textarea
                value={config.tableThresholds.join(', ')}
                onChange={(e) => {
                  const values = e.target.value
                    .split(',')
                    .map(v => parseInt(v.trim()))
                    .filter(v => !isNaN(v) && v >= 0);
                  setConfig(prev => ({ ...prev, tableThresholds: values }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent font-mono"
                rows={3}
                placeholder="100, 255, 475, 770, 1150, 1625, ..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Define XP required for each level. Values must be ascending. Current levels: {config.tableThresholds.length}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSaving}
          className="px-6 py-2 bg-[#5865F2] text-white rounded-md hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
        >
          {isSaving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </form>
  );
}
