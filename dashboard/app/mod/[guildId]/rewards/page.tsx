'use client';

import { useParams } from 'next/navigation';
import { RewardsConfigForm } from '@/components/rewards';

export default function ModRewardsPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  return <RewardsConfigForm guildId={guildId} />;
}
