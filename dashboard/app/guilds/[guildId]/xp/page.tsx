export const dynamic = "force-dynamic"
import { getUserSession } from "@/lib/auth"
import { redirect } from "next/navigation"
import { UserDropdown } from "@/components/user-dropdown"
import Link from "next/link"
import XPConfigForm from "@/components/xp-config-form"

interface Guild {
    id: string;
    name: string;
    icon: string | null;
    owner: boolean;
    permissions: string;
}

async function getGuildXPConfig(guildId: string, token: string) {
    const BOT_API_URL = (process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000').replace(/\/api\/?$/, '') + '/api';
    const url = `${BOT_API_URL}/guilds/${guildId}/xp/config`;

    try {
        const response = await fetch(url, {
            headers: {
                Cookie: `DASHBOARD_AUTH=${token}`
            },
            cache: 'no-store'
        });

        if (!response.ok) {
            const responseText = await response.text();
            console.error('XP Config Error:', response.status, responseText);
            throw new Error(`Failed to fetch XP config: ${response.status}`);
        }

        const data = await response.json();
        return data.config;
    } catch (error) {
        console.error('Error fetching XP config:', error);
        return null;
    }
}

export default async function TextXPPage({
    params,
}: {
    params: Promise<{ guildId: string }>;
}) {
    const { guildId } = await params;
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

    const xpConfig = await getGuildXPConfig(guildId, token);

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
                                href={`/guilds/${guild.id}`}
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
                            <div>
                                <h1 className="text-xl font-semibold text-gray-900">{guild.name}</h1>
                                <p className="text-sm text-gray-500">Text XP Configuration</p>
                            </div>
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
                                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                                </svg>
                                <span>Overview</span>
                            </Link>

                            <Link
                                href={`/guilds/${guild.id}/xp`}
                                className="flex items-center space-x-3 px-3 py-2 text-sm font-medium text-white bg-[#5865F2] rounded-md"
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
                        {xpConfig ? (
                            <XPConfigForm guildId={guildId} initialConfig={xpConfig} />
                        ) : (
                            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
                                <div className="text-red-500 mb-4">
                                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900 mb-2">Failed to Load Configuration</h2>
                                <p className="text-gray-600">Unable to fetch the XP configuration. Please try again later.</p>
                            </div>
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}
