'use client';

import { useParams } from 'next/navigation';
import TextXPConfigPage from '@/components/text-xp-config-page';

export default function ModTextXPPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  return <TextXPConfigPage guildId={guildId} />;
}
