import { ModNotFound } from '@/components/mod/mod-not-found';

export default function GuildModNotFoundPage() {
  return (
    <ModNotFound
      fullScreen={false}
      message="This page doesn't exist. Check the URL or navigate using the sidebar."
    />
  );
}
