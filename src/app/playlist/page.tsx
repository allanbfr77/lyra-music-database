import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import PlaylistBuilder from '@/components/PlaylistBuilder';
import { canAccessSlides, getAuthSession } from '@/lib/auth';
import { searchSongs } from '@/lib/songs';
import type { SearchHit } from '@/lib/types';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Playlist do Culto',
  robots: { index: false, follow: false },
};

export default async function PlaylistPage() {
  let songs: SearchHit[] = [];
  try {
    songs = await searchSongs('', 200, 0);
  } catch {
    songs = [];
  }

  const { user, isAdmin } = await getAuthSession();
  const cultoMode = canAccessSlides(user, isAdmin);

  return (
    <>
      <SiteHeader backHref="/" />
      <main className="shell">
        <PlaylistBuilder songs={songs} cultoMode={cultoMode} loggedIn={Boolean(user)} />
      </main>
    </>
  );
}
