export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth';
import Link from 'next/link';

export default async function ModDashboardHome() {
  const session = await getUserSession();
  if (!session) redirect('/mod/login');

  const guilds = session.guilds.filter(
    (g) => (BigInt(g.permissions) & BigInt(0x20)) === BigInt(0x20) || g.owner
  );

  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-16">
      <div className="w-full max-w-4xl">
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-[var(--mono-white)]">
          Moderation Dashboard
        </h1>
        <p className="mb-8 text-[var(--mod-text-muted)]">
          Select a server to manage cases and evidence.
        </p>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {guilds.map((guild) => {
            const iconUrl = guild.icon
              ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=64`
              : null;

            return (
              <Link
                key={guild.id}
                href={`/mod/${guild.id}`}
                className="flex items-center gap-3 rounded-lg border border-[var(--mod-border)] bg-[var(--mod-surface)] p-4 transition-colors hover:border-[var(--mod-border-hover)] hover:bg-[var(--mod-surface-hover)]"
              >
                {iconUrl ? (
                  <img src={iconUrl} alt="" className="h-10 w-10 rounded-full" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mono-700)] text-sm font-medium">
                    {guild.name.charAt(0)}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--mono-white)]">{guild.name}</p>
                  <p className="text-xs text-[var(--mod-text-dim)]">{guild.id}</p>
                </div>
              </Link>
            );
          })}
        </div>

        {guilds.length === 0 && (
          <div className="rounded-lg border border-[var(--mod-border)] bg-[var(--mod-surface)] p-8 text-center">
            <p className="text-[var(--mod-text-muted)]">
              No servers with moderation access found.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
