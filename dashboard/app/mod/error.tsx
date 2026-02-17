'use client';

import { ModError } from '@/components/mod/mod-error';

export default function ModErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <ModError reset={reset} />;
}
