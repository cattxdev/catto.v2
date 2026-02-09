export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getUserSession } from '@/lib/auth';
import { ServerPicker } from '@/components/mod/server-picker';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';
const MANAGE_GUILD = BigInt(0x20);

async function getAccessibleGuildIds(
  guildIds: string[],
  authCookie: string
): Promise<string[] | null> {
  try {
    const res = await fetch(`${BOT_API_URL}/api/guilds/accessible`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `DASHBOARD_AUTH=${authCookie}`,
      },
      body: JSON.stringify({ guildIds }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.guildIds ?? null;
  } catch {
    return null;
  }
}

export default async function ModDashboardHome() {
  const session = await getUserSession();
  if (!session) redirect('/mod/login');

  // Pre-filter to guilds where user has MANAGE_GUILD to reduce batch size
  const modGuilds = session.guilds.filter(
    (g) => (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD || g.owner
  );

  // Ask bot which of these guilds are actually accessible
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('DASHBOARD_AUTH')?.value;

  let filteredGuilds = modGuilds;

  if (authCookie && modGuilds.length > 0) {
    const accessibleIds = await getAccessibleGuildIds(
      modGuilds.map((g) => g.id),
      authCookie
    );

    // On success, filter; on failure (null), fall back to showing all mod guilds
    if (accessibleIds) {
      const idSet = new Set(accessibleIds);
      filteredGuilds = modGuilds.filter((g) => idSet.has(g.id));
    }
  }

  return (
    <ServerPicker
      session={{
        user: {
          id: session.user.id,
          username: session.user.username,
          avatar: session.user.avatar,
        },
        guilds: filteredGuilds,
      }}
    />
  );
}
