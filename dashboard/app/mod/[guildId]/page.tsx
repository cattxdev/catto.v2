export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { getUserSession } from '@/lib/auth';
import Link from 'next/link';

export default async function GuildModOverview({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const session = await getUserSession();
  if (!session) redirect('/');

  const guild = session.guilds.find((g) => g.id === guildId);

  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold text-[var(--mono-white)]">
        {guild?.name ?? 'Unknown Server'}
      </h1>
      <p className="mb-8 text-sm text-[var(--mod-text-muted)]">
        Moderation overview for {guildId}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href={`/mod/${guildId}/cases`}
          className="rounded-lg border border-[var(--mod-border)] bg-[var(--mod-surface)] p-6 transition-colors hover:border-[var(--mod-border-hover)]"
        >
          <h3 className="mb-1 font-semibold text-[var(--mono-white)]">Cases</h3>
          <p className="text-sm text-[var(--mod-text-muted)]">
            View and manage moderation cases with evidence.
          </p>
        </Link>

        <Link
          href={`/mod/${guildId}/evidence`}
          className="rounded-lg border border-[var(--mod-border)] bg-[var(--mod-surface)] p-6 transition-colors hover:border-[var(--mod-border-hover)]"
        >
          <h3 className="mb-1 font-semibold text-[var(--mono-white)]">Evidence</h3>
          <p className="text-sm text-[var(--mod-text-muted)]">
            Browse all evidence across cases.
          </p>
        </Link>
      </div>
    </div>
  );
}
