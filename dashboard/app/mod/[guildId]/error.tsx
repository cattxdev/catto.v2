'use client';

import { useParams } from 'next/navigation';
import { ModError } from '@/components/mod/mod-error';

export default function GuildModErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const params = useParams();
  const guildId = params?.guildId as string | undefined;
  return <ModError reset={reset} fullScreen={false} backHref={guildId ? `/mod/${guildId}` : '/mod'} backLabel="Back to overview" />;
}
