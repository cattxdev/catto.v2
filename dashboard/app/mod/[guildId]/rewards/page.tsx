'use client';

import { useParams } from 'next/navigation';
import RewardsConfigForm from '@/components/rewards-config-form';

export default function ModRewardsPage() {
  const params = useParams();
  const guildId = params.guildId as string;

  return <RewardsConfigForm guildId={guildId} />;
}
