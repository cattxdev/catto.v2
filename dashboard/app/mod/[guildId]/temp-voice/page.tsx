'use client';

import { useParams } from 'next/navigation';
import TempVoiceConfigForm from '@/components/temp-voice-config-form';

export default function ModTempVoicePage() {
  const params = useParams();
  const guildId = params.guildId as string;

  return <TempVoiceConfigForm guildId={guildId} />;
}
