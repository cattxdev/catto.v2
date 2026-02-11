'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface SaveFooterProps {
  saving: boolean;
  hasChanges?: boolean;
}

export function SaveFooter({ saving, hasChanges = true }: SaveFooterProps) {
  return (
    <Card variant="glass" className="overflow-hidden sticky bottom-4">
      <div className="h-0.5 bg-gradient-to-r from-foreground/20 via-foreground/10 to-transparent" />
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${hasChanges ? 'bg-warning animate-pulse' : 'bg-success'}`} />
            <p className="text-sm text-muted-foreground">
              {hasChanges ? 'You have unsaved changes' : 'All changes saved'}
            </p>
          </div>
          <Button type="submit" variant="neon" disabled={saving} className="min-w-32">
            {saving ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Saving...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save Changes
              </span>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
