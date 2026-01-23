"use client"

import Link from "next/link"
import { UserDropdown } from "@/components/user-dropdown"

interface Guild {
    id: string;
    name: string;
    icon: string | null;
}

interface User {
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
}

interface GuildPageLayoutProps {
    guild: Guild;
    user: User;
    activeTab: 'overview' | 'text-xp' | 'voice-xp' | 'rewards' | 'temp-voice' | 'logs';
    pageTitle: string;
    children: React.ReactNode;
}

export default function GuildPageLayout({ guild, user, activeTab, pageTitle, children }: GuildPageLayoutProps) {
    const guildIconUrl = guild.icon
        ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
        : null;

    const navItems = [
        { id: 'overview', href: `/guilds/${guild.id}`, label: 'Overview', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
        { id: 'text-xp', href: `/guilds/${guild.id}/xp`, label: 'Text XP', icon: 'M13 10V3L4 14h7v7l9-11h-7z' },
        { id: 'voice-xp', href: `/guilds/${guild.id}/voice-xp`, label: 'Voice XP', icon: 'M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z' },
        { id: 'rewards', href: `/guilds/${guild.id}/rewards`, label: 'Rewards', icon: 'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7' },
        { id: 'temp-voice', href: `/guilds/${guild.id}/temp-voice`, label: 'Temp Voice', icon: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' },
        { id: 'logs', href: `/guilds/${guild.id}/logs`, label: 'Logging', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' }
    ] as const;

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
                                <p className="text-sm text-gray-500">{pageTitle}</p>
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
                            {navItems.map((item) => {
                                const isActive = item.id === activeTab;
                                return (
                                    <Link
                                        key={item.id}
                                        href={item.href}
                                        className={`flex items-center space-x-3 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                                            isActive
                                                ? 'text-white bg-[#5865F2]'
                                                : 'text-gray-700 hover:bg-gray-100'
                                        }`}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                                        </svg>
                                        <span>{item.label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="lg:col-span-3">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
