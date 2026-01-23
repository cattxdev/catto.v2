"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import type { XPConfig } from "@/lib/services/text-xp.service"
import { textXPService } from "@/lib/services/text-xp.service"
import { useGuildData } from "@/hooks/use-guild-data"

interface XPConfigFormProps {
  guildId: string;
  initialConfig: XPConfig;
}

export default function XPConfigForm({ guildId, initialConfig }: XPConfigFormProps) {
  const router = useRouter();
  const [config, setConfig] = useState<XPConfig>(initialConfig);
  const { channels, roles, textChannels, loading: isLoadingData } = useGuildData(guildId);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await textXPService.updateConfig(guildId, config);
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
              <label className="text-sm font-medium text-gray-700">Enable Text XP System</label>
              <p className="text-sm text-gray-500">Allow users to gain XP from messages</p>
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
          {/* Cooldown */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cooldown (seconds)
            </label>
            <input
              type="number"
              value={config.cooldownSec}
              onChange={(e) => setConfig(prev => ({ ...prev, cooldownSec: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
              min="0"
              max="3600"
            />
            <p className="text-xs text-gray-500 mt-1">Time between XP awards</p>
          </div>

          {/* Min Message Length */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Minimum Message Length
            </label>
            <input
              type="number"
              value={config.minMessageLength}
              onChange={(e) => setConfig(prev => ({ ...prev, minMessageLength: parseInt(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
              min="0"
              max="2000"
            />
            <p className="text-xs text-gray-500 mt-1">Characters required to earn XP</p>
          </div>

          {/* XP Mode */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              XP Mode
            </label>
            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, xpMode: 'RANDOM' }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  config.xpMode === 'RANDOM'
                    ? 'border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Random</div>
                <div className="text-xs opacity-75">Random XP between min and max</div>
              </button>
              <button
                type="button"
                onClick={() => setConfig(prev => ({ ...prev, xpMode: 'FIXED' }))}
                className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                  config.xpMode === 'FIXED'
                    ? 'border-[#5865F2] bg-[#5865F2]/10 text-[#5865F2]'
                    : 'border-gray-200 text-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">Fixed</div>
                <div className="text-xs opacity-75">Same XP every time</div>
              </button>
            </div>
          </div>

          {/* XP Values */}
          {config.xpMode === 'RANDOM' ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Minimum XP
                </label>
                <input
                  type="number"
                  value={config.minXp}
                  onChange={(e) => setConfig(prev => ({ ...prev, minXp: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  min="0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Maximum XP
                </label>
                <input
                  type="number"
                  value={config.maxXp}
                  onChange={(e) => setConfig(prev => ({ ...prev, maxXp: parseInt(e.target.value) || 0 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  min="0"
                />
              </div>
            </>
          ) : (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fixed XP Amount
              </label>
              <input
                type="number"
                value={config.fixedXp}
                onChange={(e) => setConfig(prev => ({ ...prev, fixedXp: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                min="0"
              />
            </div>
          )}

          {/* Max XP per Minute */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max XP per Minute (Optional)
            </label>
            <input
              type="number"
              value={config.maxXpPerMinute || ''}
              onChange={(e) => setConfig(prev => ({ 
                ...prev, 
                maxXpPerMinute: e.target.value ? parseInt(e.target.value) : null 
              }))}
              placeholder="No limit"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty for no rate limit</p>
          </div>
        </div>
      </div>

      {/* Channel & Role Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Channel & Role Filters</h2>
        
        {isLoadingData ? (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-[#5865F2]"></div>
            <p className="text-sm text-gray-500 mt-2">Loading channels and roles...</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Allowed Channels
              </label>
              <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                {channels.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2 px-2">No channels available</p>
                ) : (
                  <>
                    <label className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.allowedChannels.length === 0}
                        onChange={() => setConfig(prev => ({ ...prev, allowedChannels: [] }))}
                        className="w-4 h-4 text-[#5865F2] border-gray-300 rounded focus:ring-[#5865F2]"
                      />
                      <span className="text-sm font-medium text-gray-700">All Channels (Default)</span>
                    </label>
                    <div className="border-t border-gray-200 my-2"></div>
                    {channels.map(channel => (
                      <label key={channel.id} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={config.allowedChannels.includes(channel.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setConfig(prev => ({ ...prev, allowedChannels: [...prev.allowedChannels, channel.id] }));
                            } else {
                              setConfig(prev => ({ ...prev, allowedChannels: prev.allowedChannels.filter(id => id !== channel.id) }));
                            }
                          }}
                          className="w-4 h-4 text-[#5865F2] border-gray-300 rounded focus:ring-[#5865F2]"
                        />
                        <span className="text-sm text-gray-700"># {channel.name}</span>
                      </label>
                    ))}
                  </>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Leave empty to allow all channels</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ignored Channels
              </label>
              <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                {channels.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2 px-2">No channels available</p>
                ) : (
                  channels.map(channel => (
                    <label key={channel.id} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.ignoredChannels.includes(channel.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig(prev => ({ ...prev, ignoredChannels: [...prev.ignoredChannels, channel.id] }));
                          } else {
                            setConfig(prev => ({ ...prev, ignoredChannels: prev.ignoredChannels.filter(id => id !== channel.id) }));
                          }
                        }}
                        className="w-4 h-4 text-[#5865F2] border-gray-300 rounded focus:ring-[#5865F2]"
                      />
                      <span className="text-sm text-gray-700"># {channel.name}</span>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Users won't earn XP in these channels</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ignored Roles
              </label>
              <div className="border border-gray-300 rounded-md p-2 max-h-48 overflow-y-auto">
                {roles.length === 0 ? (
                  <p className="text-sm text-gray-500 py-2 px-2">No roles available</p>
                ) : (
                  roles.map(role => (
                    <label key={role.id} className="flex items-center space-x-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        checked={config.ignoredRoles.includes(role.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setConfig(prev => ({ ...prev, ignoredRoles: [...prev.ignoredRoles, role.id] }));
                          } else {
                            setConfig(prev => ({ ...prev, ignoredRoles: prev.ignoredRoles.filter(id => id !== role.id) }));
                          }
                        }}
                        className="w-4 h-4 text-[#5865F2] border-gray-300 rounded focus:ring-[#5865F2]"
                      />
                      <div className="flex items-center space-x-2">
                        {role.color > 0 && (
                          <div 
                            className="w-3 h-3 rounded-full" 
                            style={{ backgroundColor: `#${role.color.toString(16).padStart(6, '0')}` }}
                          ></div>
                        )}
                        <span className="text-sm text-gray-700">{role.name}</span>
                      </div>
                    </label>
                  ))
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">Users with these roles won't earn XP</p>
            </div>
          </div>
        )}
      </div>

      {/* Level-Up Announcements */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Level-Up Announcements</h2>
        
        <div className="space-y-4">
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Announcement Channel ID (Optional)
                </label>
                <input
                  type="text"
                  value={config.announceChannelId || ''}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    announceChannelId: e.target.value || null 
                  }))}
                  placeholder="Leave empty to announce in message channel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message Template
                </label>
                <input
                  type="text"
                  value={config.messageTemplate}
                  onChange={(e) => setConfig(prev => ({ ...prev, messageTemplate: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                  maxLength={2000}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Variables: {'{user}'}, {'{level}'}, {'{xpGain}'}, {'{totalXp}'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">Use Embed</label>
                  <p className="text-sm text-gray-500">Show level-up in a fancy embed</p>
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
                    Embed Color (Hex)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={`#${config.embedColor.toString(16).padStart(6, '0')}`}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        embedColor: parseInt(e.target.value.slice(1), 16) 
                      }))}
                      className="h-10 w-20 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      value={`#${config.embedColor.toString(16).padStart(6, '0').toUpperCase()}`}
                      onChange={(e) => {
                        const hex = e.target.value.replace('#', '');
                        if (/^[0-9A-Fa-f]{0,6}$/.test(hex)) {
                          setConfig(prev => ({ 
                            ...prev, 
                            embedColor: parseInt(hex || '0', 16) 
                          }));
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Curve Type
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
                <div className="text-xs opacity-75">Custom XP thresholds</div>
              </button>
            </div>
          </div>

          {config.levelCurveType === 'FORMULA' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Base
                </label>
                <input
                  type="number"
                  value={config.formulaBase}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    formulaBase: parseFloat(e.target.value) || 0 
                  }))}
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exponent
                </label>
                <input
                  type="number"
                  value={config.formulaExponent}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    formulaExponent: parseFloat(e.target.value) || 0 
                  }))}
                  step="0.1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Offset
                </label>
                <input
                  type="number"
                  value={config.formulaOffset}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    formulaOffset: parseFloat(e.target.value) || 0 
                  }))}
                  step="1"
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent"
                />
              </div>
              <div className="md:col-span-3">
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 font-mono">
                  Formula: XP = {config.formulaBase} × (level ^ {config.formulaExponent}) + {config.formulaOffset}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Table Thresholds (comma-separated XP values)
              </label>
              <textarea
                value={config.tableThresholds.join(', ')}
                onChange={(e) => {
                  const values = e.target.value.split(',').map(v => parseInt(v.trim())).filter(v => !isNaN(v));
                  setConfig(prev => ({ ...prev, tableThresholds: values }));
                }}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#5865F2] focus:border-transparent font-mono text-sm"
                placeholder="100, 255, 475, 770, 1150..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Each value represents the total XP needed for that level (ascending order)
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Make sure to save your changes before leaving this page.
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2 bg-[#5865F2] text-white rounded-md hover:bg-[#4752C4] disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </form>
  );
}
