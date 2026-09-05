import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import CustomPlaylistSlides from '@/components/CustomPlaylistSlides';
import { ADMIN_HOME, canAccessSlides, getAuthSession } from '@/lib/auth';
import { customPlaylistPath } from '@/lib/playlist';
import { loadUserCustomSlides } from '@/lib/user-slides';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Slides — música da playlist',
  robots: { index: false, follow: false },
};

export default async function CustomPlaylistSongPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ pl?: string }>;
}) {
  const { id } = await params;
  const { pl } = await searchParams;
  const session = await getAuthSession();
  if (session.isAdmin) redirect(ADMIN_HOME);
  if (!canAccessSlides(session.user, session.isAdmin)) {
    const next = `${customPlaylistPath(id)}${pl === '1' ? '?pl=1' : ''}`;
    redirect(`/login?next=${encodeURIComponent(next)}`);
  }

  return (
    <>
      <SiteHeader backHref="/playlist" />
      <main className="shell">
        <CustomPlaylistSlides id={id} initial={await loadUserCustomSlides(id)} />
      </main>
    </>
  );
}
