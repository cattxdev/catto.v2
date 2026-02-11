'use client';

import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  onAddClick: () => void;
}

export function PageHeader({ onAddClick }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/50">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Level Rewards</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Configure role rewards, permissions, and announcements for XP milestones
        </p>
      </div>
      <Button variant="neon" onClick={onAddClick} className="shrink-0">
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6v6m0 0v6m0-6h6m-6 0H6"
          />
        </svg>
        Add Reward
      </Button>
    </div>
  );
}
