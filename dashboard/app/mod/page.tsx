export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth';
import { ServerPicker } from '@/components/mod/server-picker';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';
const MANAGE_GUILD = BigInt(0x20);

/** Fetch the set of guild IDs the bot is currently joined to. */
async function getBotGuildIds(): Promise<Set<string> | null> {
  try {
    const res = await fetch(`${BOT_API_URL}/api/guilds`, {
      next: { revalidate: 60 },
    });

    if (!res.ok) return null;

    const data = await res.json();
    return new Set((data.guilds as { id: string }[]).map((g) => g.id));
  } catch {
    return null;
  }
}

export default async function ModDashboardHome() {
  const session = await getUserSession();
  if (!session) redirect('/mod/login');

  // Pre-filter to guilds where user has MANAGE_GUILD
  const modGuilds = session.guilds.filter(
    (g) => (BigInt(g.permissions) & MANAGE_GUILD) === MANAGE_GUILD || g.owner
  );

  // Filter to only guilds the bot is actually joined to
  const botGuildIds = await getBotGuildIds();
  const filteredGuilds = botGuildIds
    ? modGuilds.filter((g) => botGuildIds.has(g.id))
    : modGuilds;

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
