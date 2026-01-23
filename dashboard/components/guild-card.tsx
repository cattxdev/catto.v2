"use client"

import Link from "next/link"

interface Guild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

export function GuildCard({ guild }: { guild: Guild }) {
  const guildIconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`
    : null;

  // Check if user has MANAGE_GUILD permission (bit 5)
  const hasManageGuild = (BigInt(guild.permissions) & BigInt(0x20)) !== BigInt(0);
  const canManage = guild.owner || hasManageGuild;

  return (
    <Link
      href={canManage ? `/guilds/${guild.id}` : '#'}
      className={`
        block bg-white rounded-lg border border-gray-200 p-6
        transition-all duration-200
        ${canManage 
          ? 'hover:shadow-lg hover:border-[#5865F2] cursor-pointer' 
          : 'opacity-50 cursor-not-allowed'
        }
      `}
      onClick={(e) => {
        if (!canManage) {
          e.preventDefault();
        }
      }}
    >
      <div className="flex flex-col items-center space-y-4">
        {/* Guild Icon */}
        {guildIconUrl ? (
          <img
            src={guildIconUrl}
            alt={guild.name}
            className="w-20 h-20 rounded-full"
          />
        ) : (
          <div className="w-20 h-20 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-2xl font-bold">
            {guild.name.charAt(0).toUpperCase()}
          </div>
        )}

        {/* Guild Name */}
        <div className="text-center">
          <h3 className="font-semibold text-gray-900 line-clamp-2">{guild.name}</h3>
          {guild.owner && (
            <span className="inline-block mt-2 text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
              Owner
            </span>
          )}
          {!canManage && (
            <span className="inline-block mt-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
              No Permission
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}
