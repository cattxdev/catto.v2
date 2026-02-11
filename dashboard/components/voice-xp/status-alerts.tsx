'use client';

import { useEffect, useState } from 'react';

interface StatusAlertsProps {
  error: string | null;
  success: boolean;
}

export function StatusAlerts({ error, success }: StatusAlertsProps) {
  const [visible, setVisible] = useState({ error: false, success: false });

  useEffect(() => {
    if (error) {
      setVisible(prev => ({ ...prev, error: true }));
    } else {
      setVisible(prev => ({ ...prev, error: false }));
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      setVisible(prev => ({ ...prev, success: true }));
    } else {
      setVisible(prev => ({ ...prev, success: false }));
    }
  }, [success]);

  if (!error && !success) return null;

  return (
    <div className="space-y-3">
      {error && (
        <div className={`relative overflow-hidden glass border-destructive/50 rounded-lg p-4 flex items-start gap-3 transition-all duration-300 ${visible.error ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive" />
          <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-destructive"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-destructive">Error</h3>
            <p className="text-sm text-destructive/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {success && (
        <div className={`relative overflow-hidden glass border-success/50 rounded-lg p-4 flex items-start gap-3 transition-all duration-300 ${visible.success ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2'}`}>
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-success" />
          <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-4 h-4 text-success animate-in zoom-in duration-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-medium text-success">Success</h3>
            <p className="text-sm text-success/80 mt-1">Configuration saved successfully!</p>
          </div>
        </div>
      )}
    </div>
  );
}
