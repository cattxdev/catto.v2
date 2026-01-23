import { getUserSession } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

interface GuildPageData {
  guild: Guild;
  user: {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  };
  token: string;
}

export async function getGuildPageData(guildId: string): Promise<GuildPageData> {
  const session = await getUserSession();

  if (!session) {
    redirect('/');
  }

  const { user, guilds } = session;
  const guild = guilds.find((g: Guild) => g.id === guildId);

  if (!guild) {
    redirect('/guilds');
  }

  const hasManageGuild = (BigInt(guild.permissions) & BigInt(0x20)) !== BigInt(0);
  const canManage = guild.owner || hasManageGuild;

  if (!canManage) {
    redirect('/guilds');
  }

  // Get auth token from cookies
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();
  const token = cookieStore.get('DASHBOARD_AUTH')?.value;

  if (!token) {
    redirect('/');
  }

  return { guild, user, token };
}
