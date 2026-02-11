'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import type { ConfigSectionProps } from './types';

export function LevelCurveConfig({ config, onChange }: ConfigSectionProps) {
  // Calculate sample XP requirements to show preview
  const getSampleXP = (level: number) => {
    if (config.levelCurveType === 'TABLE') {
      return config.tableThresholds[level - 1] || 0;
    }
    return Math.round(config.formulaBase * Math.pow(level, config.formulaExponent) + config.formulaOffset);
  };

  return (
    <Card variant="glass" className="overflow-hidden">
      <div className="h-1 bg-gradient-to-r from-pink-500/50 to-transparent" />
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-pink-500/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
          </div>
          <div>
            <CardTitle>Level Curve Configuration</CardTitle>
            <CardDescription>Define how XP requirements scale with level</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Curve Type Selection */}
        <div className="space-y-3">
          <label className="block text-sm font-medium text-foreground">
            Curve Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, levelCurveType: 'FORMULA' }))}
              className={`group p-4 rounded-lg border transition-all text-left ${
                config.levelCurveType === 'FORMULA'
                  ? 'bg-muted/40 border-foreground/30 ring-1 ring-foreground/10'
                  : 'bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${config.levelCurveType === 'FORMULA' ? 'bg-foreground/10' : 'bg-muted/50'}`}>
                  <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">Formula</div>
                  <div className="text-xs text-muted-foreground">Use mathematical formula</div>
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => onChange((prev) => ({ ...prev, levelCurveType: 'TABLE' }))}
              className={`group p-4 rounded-lg border transition-all text-left ${
                config.levelCurveType === 'TABLE'
                  ? 'bg-muted/40 border-foreground/30 ring-1 ring-foreground/10'
                  : 'bg-muted/20 border-border/30 hover:bg-muted/40 hover:border-border/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${config.levelCurveType === 'TABLE' ? 'bg-foreground/10' : 'bg-muted/50'}`}>
                  <svg className="w-4 h-4 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <div className="font-medium text-foreground">Table</div>
                  <div className="text-xs text-muted-foreground">Custom XP thresholds</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Formula Settings */}
        {config.levelCurveType === 'FORMULA' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Base</label>
                <Input
                  type="number"
                  value={config.formulaBase}
                  onChange={(e) =>
                    onChange((prev) => ({ ...prev, formulaBase: parseFloat(e.target.value) || 0 }))
                  }
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Multiplier coefficient</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Exponent</label>
                <Input
                  type="number"
                  value={config.formulaExponent}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      formulaExponent: parseFloat(e.target.value) || 0,
                    }))
                  }
                  step="0.1"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Growth rate</p>
              </div>
              <div className="space-y-2">
                <label className="block text-sm font-medium text-foreground">Offset</label>
                <Input
                  type="number"
                  value={config.formulaOffset}
                  onChange={(e) =>
                    onChange((prev) => ({
                      ...prev,
                      formulaOffset: parseFloat(e.target.value) || 0,
                    }))
                  }
                  step="1"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">Base XP added</p>
              </div>
            </div>
            
            <div className="p-6 rounded-lg bg-gradient-to-br from-pink-500/5 via-muted/20 to-purple-500/5 border border-pink-500/20">
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Formula Preview</span>
              </div>
              <div className="flex items-center justify-center gap-3 text-2xl font-semibold mb-4 flex-wrap">
                <span className="text-foreground">XP</span>
                <span className="text-muted-foreground text-xl">=</span>
                <span className="px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono">
                  {config.formulaBase}
                </span>
                <span className="text-muted-foreground text-xl">×</span>
                <span className="text-foreground">(</span>
                <div className="flex items-start">
                  <span className="text-foreground">level</span>
                  <span className="text-sm px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20 font-mono -mt-1 ml-0.5">
                    {config.formulaExponent}
                  </span>
                </div>
                <span className="text-foreground">)</span>
                <span className="text-muted-foreground text-xl">+</span>
                <span className="px-3 py-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 font-mono">
                  {config.formulaOffset}
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {[1, 5, 10, 25, 50].map((level) => (
                  <div key={level} className="p-3 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 border border-border/40 hover:from-pink-500/10 hover:to-purple-500/10 hover:border-pink-500/30 transition-all">
                    <div className="text-xs text-muted-foreground mb-1">Level {level}</div>
                    <div className="font-semibold text-foreground text-sm">{getSampleXP(level).toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">XP</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Table Settings */}
        {config.levelCurveType === 'TABLE' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground">
                Table Thresholds (comma-separated XP values)
              </label>
              <textarea
                value={config.tableThresholds.join(', ')}
                onChange={(e) => {
                  const values = e.target.value
                    .split(',')
                    .map((v) => parseInt(v.trim()))
                    .filter((v) => !isNaN(v));
                  onChange((prev) => ({ ...prev, tableThresholds: values }));
                }}
                rows={3}
                className="w-full px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors font-mono text-sm resize-none"
                placeholder="100, 255, 475, 770, 1150..."
              />
              <p className="text-xs text-muted-foreground">
                Each value represents the total XP needed for that level (ascending order)
              </p>
            </div>

            <div className="p-6 rounded-lg bg-gradient-to-br from-pink-500/5 via-muted/20 to-purple-500/5 border border-pink-500/20">
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Level Thresholds Preview</span>
                <span className="text-xs text-muted-foreground bg-pink-500/10 border border-pink-500/20 px-3 py-1 rounded-full">
                  {config.tableThresholds.length} levels defined
                </span>
              </div>
              <div className="grid grid-cols-5 gap-2 text-center max-h-32 overflow-y-auto">
                {config.tableThresholds.slice(0, 10).map((xp, index) => (
                  <div key={index} className="p-3 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 border border-border/40 hover:from-pink-500/10 hover:to-purple-500/10 hover:border-pink-500/30 transition-all">
                    <div className="text-xs text-muted-foreground mb-1">Level {index + 1}</div>
                    <div className="font-semibold text-foreground text-sm">{xp.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground/70 mt-0.5">XP</div>
                  </div>
                ))}
                {config.tableThresholds.length > 10 && (
                  <div className="p-3 rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 border border-border/40 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">+{config.tableThresholds.length - 10} more</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
