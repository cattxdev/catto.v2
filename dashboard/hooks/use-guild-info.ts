'use client';

import { useState, useEffect, useRef } from 'react';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';

interface GuildInfo {
  id: string;
  name: string;
  icon: string | null;
}

/**
 * Pre-populate guild info into sessionStorage so the sidebar loads instantly
 * when navigating from the server picker. Call this before navigation.
 */
export function cacheGuildInfo(guild: { id: string; name: string; icon: string | null }) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(`guild-info:${guild.id}`, JSON.stringify(guild));
}

export function useGuildInfo(guildId: string): GuildInfo | null {
  const [info, setInfo] = useState<GuildInfo | null>(null);

  const fetchedRef = useRef(false);

  useEffect(() => {
    // Try sessionStorage first (populated by cacheGuildInfo before navigation)
    const cached = sessionStorage.getItem(`guild-info:${guildId}`);
    if (cached) {
      try {
        setInfo(JSON.parse(cached));
        return;
      } catch {
        // fall through to fetch
      }
    }

    if (fetchedRef.current) return;
    fetchedRef.current = true;

    fetch(`${BOT_API_URL}/api/users/@me`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data?.guilds) {
          const guild = data.guilds.find((g: { id: string }) => g.id === guildId);
          if (guild) {
            const guildInfo: GuildInfo = {
              id: guild.id,
              name: guild.name,
              icon: guild.icon,
            };
            setInfo(guildInfo);
            sessionStorage.setItem(`guild-info:${guildId}`, JSON.stringify(guildInfo));
          }
        }
      })
      .catch(() => {});
  }, [guildId]);

  return info;
}
