export const dynamic = 'force-dynamic';

import { LoginButton } from '@/components/login-button';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function Home() {
  redirect('/mod');
}