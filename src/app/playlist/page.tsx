import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import PlaylistBuilder from '@/components/PlaylistBuilder';
import { canAccessSlides, getAuthUser } from '@/lib/auth';
import { searchSongs } from '@/lib/songs';
import { createClient } from '@/lib/supabase/server';
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

  const user = await getAuthUser();
  const cultoMode = canAccessSlides(user);
  let isAdmin = false;
  if (user) {
    const supabase = await createClient();
    const { data } = await supabase.rpc('is_admin');
    isAdmin = Boolean(data);
  }

  return (
    <>
      <SiteHeader backHref="/" />
      <main className="shell">
        <PlaylistBuilder songs={songs} cultoMode={cultoMode} isAdmin={isAdmin} />
      </main>
    </>
  );
}
