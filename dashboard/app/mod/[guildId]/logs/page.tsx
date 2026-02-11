'use client';

import { useParams } from 'next/navigation';
import LoggingConfigForm from '@/components/logging-config-form';

export default function ModLogsPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  return <LoggingConfigForm guildId={guildId} />;
}
