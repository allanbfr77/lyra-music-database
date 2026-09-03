import type { ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import ChordView from '@/components/ChordView';
import { getSongBySlug, publishedKeys } from '@/lib/songs';
import { slugToKey } from '@/lib/chords';

export default async function ChordLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; tom: string }>;
}) {
  const { slug, tom } = await params;
  const key = slugToKey(tom);
  const song = await getSongBySlug(slug).catch(() => null);

  // Página inválida: o page.tsx cuida do 404/redirect sem montar o leitor.
  if (!key || !song?.chords.trim()) return children;

  const { overrides, ...publicSong } = song;

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <ChordView
          song={publicSong}
          keys={publishedKeys(song)}
          overrides={overrides.map((o) => ({ key: o.key, chords: o.chords }))}
          initialKey={key}
          notice={children}
        />
      </main>
    </>
  );
}
