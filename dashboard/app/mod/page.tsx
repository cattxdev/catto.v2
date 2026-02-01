export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth';
import { ServerPicker } from '@/components/mod/server-picker';

export default async function ModDashboardHome() {
  const session = await getUserSession();
  if (!session) redirect('/mod/login');

  return (
    <ServerPicker
      session={{
        user: {
          id: session.user.id,
          username: session.user.username,
          avatar: session.user.avatar,
        },
        guilds: session.guilds,
      }}
    />
  );
}
