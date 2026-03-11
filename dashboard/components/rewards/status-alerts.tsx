'use client';

import { useEffect, useState } from 'react';

interface StatusAlertsProps {
  error: string | null;
  success: boolean;
}

export function StatusAlerts({ error, success }: StatusAlertsProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error || success) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [error, success]);

  if (!error && !success) return null;

  return (
    <div className={`space-y-3 transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
      {error && (
        <div className="relative overflow-hidden bg-destructive/5 border border-destructive/20 rounded-lg p-4 flex items-start gap-3">
          {/* Accent line */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />
          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-destructive" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-destructive">Something went wrong</h3>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className="relative overflow-hidden bg-success/5 border border-success/20 rounded-lg p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Accent line */}
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-success" />
          {/* Animated checkmark */}
          <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-success animate-in zoom-in duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-success">Saved successfully</h3>
            <p className="text-sm text-success/80 mt-0.5">Your changes have been applied</p>
          </div>
        </div>
      )}
    </div>
  );
}
