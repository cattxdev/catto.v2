'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import type { RewardTemplate } from './types';

interface RewardTemplatesProps {
  templates: RewardTemplate[];
  hasExistingRewards: boolean;
  saving: boolean;
  onApplyTemplate: (templateName: string) => Promise<void>;
}

export function RewardTemplates({
  templates,
  hasExistingRewards,
  saving,
  onApplyTemplate,
}: RewardTemplatesProps) {
  if (templates.length === 0) return null;

  return (
    <Card variant="glass">
      <CardHeader>
        <CardTitle>Reward Templates</CardTitle>
        <CardDescription>
          {!hasExistingRewards
            ? 'Get started quickly with a pre-made reward configuration'
            : 'Apply a template to add more rewards to your existing configuration'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {templates.map((template) => (
            <button
              key={template.key}
              onClick={() => onApplyTemplate(template.key)}
              disabled={saving}
              className="p-4 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
            >
              <h4 className="font-medium text-foreground">{template.name}</h4>
              <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
              <p className="text-xs text-primary mt-2">{template.rewardCount} rewards</p>
            </button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
