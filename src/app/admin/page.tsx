import Link from 'next/link';
import HomeCatalog from '@/components/HomeCatalog';
import { PlusIcon, SearchIcon } from '@/components/icons';
import { createClient } from '@/lib/supabase/server';
import type { CatalogSong } from '@/components/SongList';

export const dynamic = 'force-dynamic';

type Row = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  base_key: string;
  available_keys: string[];
  published: boolean;
  chords: string;
  updated_at: string;
};

export default async function AdminHome({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = '' } = await searchParams;
  const query = q.trim();
  const supabase = await createClient();

  let request = supabase
    .from('songs')
    .select('id, slug, title, artist, base_key, available_keys, published, chords, updated_at')
    .order('title', { ascending: true })
    .limit(200);

  if (query) request = request.or(`title.ilike.%${query}%,artist.ilike.%${query}%`);

  const { data, error } = await request;
  const rows = (data ?? []) as Row[];
  const songs: CatalogSong[] = rows.map((song) => ({
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    base_key: song.base_key,
    available_keys: song.available_keys ?? [],
    has_chords: Boolean(song.chords?.trim()),
    snippet: null,
    updated_at: song.updated_at,
    rank: 0,
    href: `/admin/musica/${song.id}`,
    draft: !song.published,
  }));

  return (
    <main className="shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 0 6px' }}>
        <h1 style={{ fontSize: 22 }}>Músicas</h1>
        <span className="header-spacer" />
        <Link href="/admin/nova" className="btn btn--tint btn--sm">
          <PlusIcon size={13} />
          Nova música
        </Link>
      </div>

      <form action="/admin" className="search" style={{ marginTop: 8 }}>
        <span className="search__icon">
          <SearchIcon size={17} />
        </span>
        <input name="q" defaultValue={q} placeholder="Filtrar por título ou artista" aria-label="Filtrar" />
      </form>

      {error ? (
        <div className="alert alert--error" style={{ marginTop: 18 }}>
          {error.message}
        </div>
      ) : (
        <HomeCatalog
          songs={songs}
          query={query}
          fieldLabels="título e artista"
          showKeyFilter={false}
          emptyNoQuery={{
            title: 'Nenhuma música cadastrada',
            hint: 'Comece cadastrando a primeira.',
          }}
          emptyNoResults={{
            title: 'Nada encontrado',
            hint: 'Tente outro título ou artista.',
          }}
        />
      )}
    </main>
  );
}
