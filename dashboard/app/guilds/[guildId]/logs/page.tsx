export const dynamic = 'force-dynamic';
import { getGuildPageData } from '@/lib/server';
import GuildPageLayout from '@/components/guild-page-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default async function LogsPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const { guild, user } = await getGuildPageData(guildId);

  return (
    <GuildPageLayout guild={guild} user={user} activeTab="logs" pageTitle="Event Logging">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Event Logging</h2>
            <p className="text-muted-foreground mt-1">
              Track and log server events to dedicated channels
            </p>
          </div>
          <Button variant="neon">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6v6m0 0v6m0-6h6m-6 0H6"
              />
            </svg>
            Setup Logging
          </Button>
        </div>

        {/* Coming Soon Card */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle>Logging Configuration</CardTitle>
            <CardDescription>Configure which events to log and where to send them</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <svg
                  className="w-8 h-8 text-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Logging Dashboard Coming Soon
              </h3>
              <p className="text-muted-foreground max-w-md">
                The logging configuration interface is being built. In the meantime, you can manage
                logging using the <code className="text-primary">/logging setup</code> command in
                Discord.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Log Categories */}
        <Card variant="glass">
          <CardHeader>
            <CardTitle className="text-lg">Available Log Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                {
                  name: 'Messages',
                  description: 'Edits, deletions, bulk delete',
                  icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
                },
                {
                  name: 'Voice',
                  description: 'Join, leave, move, mute',
                  icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z',
                },
                {
                  name: 'Members',
                  description: 'Nick, role, timeout changes',
                  icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
                },
                {
                  name: 'Joins/Leaves',
                  description: 'Member join and leave',
                  icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z',
                },
                {
                  name: 'Roles',
                  description: 'Create, delete, update',
                  icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
                },
                {
                  name: 'Channels',
                  description: 'Create, delete, update',
                  icon: 'M7 20l4-16m2 16l4-16M6 9h14M4 15h14',
                },
                {
                  name: 'Server',
                  description: 'Settings, banner, icon',
                  icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
                },
                {
                  name: 'Emojis',
                  description: 'Create, delete, update',
                  icon: 'M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                },
                {
                  name: 'Events',
                  description: 'Scheduled events',
                  icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                },
              ].map((category) => (
                <div
                  key={category.name}
                  className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/30"
                >
                  <div className="p-2 rounded-lg bg-muted/50 text-muted-foreground">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={category.icon}
                      />
                    </svg>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{category.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{category.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </GuildPageLayout>
  );
}
