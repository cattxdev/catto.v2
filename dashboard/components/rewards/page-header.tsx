'use client';

import { Button } from '@/components/ui/button';

interface PageHeaderProps {
  onAddClick: () => void;
}

export function PageHeader({ onAddClick }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border/30">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="hidden sm:flex w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 items-center justify-center shrink-0">
          <svg className="w-6 h-6 text-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
          </svg>
        </div>
        {/* Text */}
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Level Rewards</h1>
          <p className="text-muted-foreground mt-1 text-sm max-w-md">
            Configure role rewards, permissions, and announcements for XP milestones
          </p>
        </div>
      </div>
      <Button variant="neon" onClick={onAddClick} className="shrink-0 group">
        <svg className="w-4 h-4 mr-2 transition-transform group-hover:rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Reward
      </Button>
    </div>
  );
}
