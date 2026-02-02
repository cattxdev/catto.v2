'use client';

import { useState, useEffect } from 'react';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';

const SESSION_KEY = 'user-me';
const CACHE_TTL = 5 * 60 * 1000;

interface UserInfo {
  id: string;
  username: string;
  avatar: string | null;
  global_name: string | null;
}

interface GuildEntry {
  id: string;
  name: string;
  icon: string | null;
}

export interface UserMeData {
  user: UserInfo;
  guilds: GuildEntry[];
}

// Module-level dedup: only one in-flight request exists at a time
let inflightPromise: Promise<UserMeData | null> | null = null;

function getCached(): UserMeData | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) {
      sessionStorage.removeItem(SESSION_KEY);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(data: UserMeData) {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

function fetchUserMe(): Promise<UserMeData | null> {
  if (inflightPromise) return inflightPromise;

  inflightPromise = fetch(`${BOT_API_URL}/api/users/@me`, { credentials: 'include' })
    .then((r) => r.json())
    .then((data) => {
      inflightPromise = null;
      if (data?.user) {
        setCache(data);
        return data as UserMeData;
      }
      return null;
    })
    .catch(() => {
      inflightPromise = null;
      return null;
    });

  return inflightPromise;
}

export function useUserMe(): UserMeData | null {
  const [data, setData] = useState<UserMeData | null>(getCached);

  useEffect(() => {
    fetchUserMe().then((result) => {
      if (result) setData(result);
    });
  }, []);

  return data;
}
