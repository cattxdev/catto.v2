import axios from 'axios';
import { cookies } from 'next/headers';

const BOT_API_URL = process.env.NEXT_PUBLIC_BOT_API_URL || 'http://localhost:4000';

export interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
  verified?: boolean;
  email?: string;
}

export interface UserSession {
  user: DiscordUser;
  guilds?: any[];
}

/**
 * Get the current authenticated user from the session cookie
 */
export async function getCurrentUser(): Promise<DiscordUser | null> {
  try {
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('SAPPHIRE_AUTH');

    if (!authCookie) {
      return null;
    }

    // Forward the cookie to the bot API to validate the session
    const response = await axios.get(`${BOT_API_URL}/api/users/@me`, {
      headers: {
        Cookie: `SAPPHIRE_AUTH=${authCookie.value}`,
      },
      withCredentials: true,
      validateStatus: (status) => status < 500, // Don't throw on 401/403
    });

    if (response.status === 200 && response.data.user) {
      return response.data.user;
    }

    return null;
  } catch (error) {
    // Silently fail - user is just not authenticated
    return null;
  }
}

/**
 * Logout action - clears the auth cookie
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('SAPPHIRE_AUTH');
}
