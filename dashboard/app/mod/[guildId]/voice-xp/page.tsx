'use client';

import { useParams } from 'next/navigation';
import VoiceXPConfigPage from '@/components/voice-xp-config-page';

export default function ModVoiceXPPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  return <VoiceXPConfigPage guildId={guildId} />;
}
