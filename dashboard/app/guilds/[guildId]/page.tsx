export const dynamic = "force-dynamic"
import { getUserSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserDropdown } from "@/components/user-dropdown"
import Link from "next/link"

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export default async function GuildPage({
  params,
}: {
  params: { guildId: string };
}) {
  const session = await getUserSession();
  
  if (!session) {
    redirect('/');
  }

  const { user, guilds } = session;
  const guild = guilds.find((g: Guild) => g.id === params.guildId);

  // Check if user has access to this guild
  if (!guild) {
    redirect('/guilds');
  }

  // Check if user has manage permissions
  const hasManageGuild = (BigInt(guild.permissions) & BigInt(0x20)) !== BigInt(0);
  const canManage = guild.owner || hasManageGuild;

  if (!canManage) {
    redirect('/guilds');
  }

  const guildIconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link
                href="/guilds"
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </Link>
              {guildIconUrl ? (
                <img
                  src={guildIconUrl}
                  alt={guild.name}
                  className="w-10 h-10 rounded-full"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-lg font-semibold">
                  {guild.name.charAt(0).toUpperCase()}
                </div>
              )}
              <h1 className="text-xl font-semibold text-gray-900">{guild.name}</h1>
            </div>
            <UserDropdown user={user} />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-1">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 space-y-1">
              <Link
                href={`/guilds/${guild.id}`}
                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-white bg-[#5865F2] rounded-md"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Overview</span>
              </Link>
              
              <Link
                href={`/guilds/${guild.id}/xp`}
                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Text XP</span>
              </Link>

              <Link
                href={`/guilds/${guild.id}/voice-xp`}
                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Voice XP</span>
              </Link>

              <Link
                href={`/guilds/${guild.id}/rewards`}
                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                </svg>
                <span>Rewards</span>
              </Link>

              <Link
                href={`/guilds/${guild.id}/temp-voice`}
                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                <span>Temp Voice</span>
              </Link>

              <Link
                href={`/guilds/${guild.id}/logs`}
                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>Logging</span>
              </Link>
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Server Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-blue-100 rounded-full p-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Server ID</p>
                      <p className="text-lg font-semibold text-gray-900">{guild.id}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="bg-green-100 rounded-full p-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Your Role</p>
                      <p className="text-lg font-semibold text-gray-900">{guild.owner ? 'Owner' : 'Manager'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Link
                    href={`/guilds/${guild.id}/xp`}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#5865F2] hover:bg-[#5865F2]/5 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      <span className="font-medium text-gray-900">Configure Text XP</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href={`/guilds/${guild.id}/rewards`}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#5865F2] hover:bg-[#5865F2]/5 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                      <span className="font-medium text-gray-900">Manage Rewards</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href={`/guilds/${guild.id}/logs`}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#5865F2] hover:bg-[#5865F2]/5 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      <span className="font-medium text-gray-900">Setup Logging</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>

                  <Link
                    href={`/guilds/${guild.id}/temp-voice`}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-[#5865F2] hover:bg-[#5865F2]/5 transition-all group"
                  >
                    <div className="flex items-center space-x-3">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                      </svg>
                      <span className="font-medium text-gray-900">Configure Temp Voice</span>
                    </div>
                    <svg className="w-5 h-5 text-gray-400 group-hover:text-[#5865F2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
