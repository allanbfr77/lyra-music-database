import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SongHeader from '@/components/SongHeader';
import SongTabs from '@/components/SongTabs';
import KeyBar from '@/components/KeyBar';
import Reader from '@/components/Reader';
import { chartForKey, getSongBySlug, publishedKeys } from '@/lib/songs';
import { keyToSlug, normalizeKey, slugToKey, uniqueChords } from '@/lib/chords';

export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string; tom: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, tom } = await params;
  const key = slugToKey(tom);
  if (!key) return { title: 'Tom inválido' };

  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) return { title: 'Música não encontrada' };

  const title = `${song.title} — Cifra em ${key}`;
  const description = `Cifra de ${song.title}${song.artist ? ` (${song.artist})` : ''} no tom de ${key}.`;

  return {
    title,
    description,
    alternates: { canonical: `/musica/${song.slug}/cifra/${keyToSlug(key)}` },
    openGraph: { title, description, url: `/musica/${song.slug}/cifra/${keyToSlug(key)}`, type: 'article' },
  };
}

export default async function ChordPage({ params }: Params) {
  const { slug, tom } = await params;

  const key = slugToKey(tom);
  if (!key) notFound();

  const song = await getSongBySlug(slug).catch(() => null);
  if (!song) notFound();

  if (!song.chords.trim()) notFound();

  const { chart, source } = chartForKey(song, song.overrides, key);
  const listed = publishedKeys(song);
  const keys = listed.includes(key) ? listed : [...listed, key];
  const manualKeys = song.overrides.map((o) => normalizeKey(o.key));
  const chordsUsed = uniqueChords(chart);

  return (
    <>
      <SiteHeader />
      <main className="shell">
        <SongHeader song={song} currentKey={key} />
        <SongTabs slug={song.slug} active="cifra" hasChords chordKeySlug={keyToSlug(key)} />
        <KeyBar slug={song.slug} keys={keys} activeKey={key} manualKeys={manualKeys} />

        <Reader mode="chords" text={chart} shareTitle={`${song.title} — cifra em ${key}`} />

        {chordsUsed.length > 0 && (
          <div className="no-print">
            <div className="keybar__label">Acordes desta versão</div>
            <div className="song-head__meta">
              {chordsUsed.slice(0, 16).map((chord) => (
                <span key={chord} className="chip" style={{ fontFamily: 'var(--mono)', color: 'var(--chord)' }}>
                  {chord}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="notice no-print">
          {source === 'manual'
            ? `Cifra revisada manualmente para o tom de ${key}.`
            : `Cifra transposta automaticamente a partir do tom original (${normalizeKey(song.base_key)}).`}
        </div>
      </main>
    </>
  );
}
