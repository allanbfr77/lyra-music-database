import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { normalizeKey } from '@/lib/chords';

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
  const supabase = await createClient();

  let query = supabase
    .from('songs')
    .select('id, slug, title, artist, base_key, available_keys, published, chords, updated_at')
    .order('updated_at', { ascending: false })
    .limit(200);

  if (q.trim()) query = query.or(`title.ilike.%${q.trim()}%,artist.ilike.%${q.trim()}%`);

  const { data, error } = await query;
  const songs = (data ?? []) as Row[];

  return (
    <main className="shell">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '22px 0 6px' }}>
        <h1 style={{ fontSize: 22 }}>Músicas</h1>
        <span className="header-spacer" />
        <Link href="/admin/nova" className="btn btn--primary btn--sm">
          Nova música
        </Link>
      </div>

      <form action="/admin" className="search" style={{ marginTop: 8 }}>
        <span className="search__icon" aria-hidden="true">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
          </svg>
        </span>
        <input name="q" defaultValue={q} placeholder="Filtrar por título ou artista" aria-label="Filtrar" />
      </form>

      {error ? (
        <div className="alert alert--error" style={{ marginTop: 18 }}>
          {error.message}
        </div>
      ) : songs.length === 0 ? (
        <div className="empty">
          <strong>Nenhuma música cadastrada</strong>
          <span className="small">Comece cadastrando a primeira.</span>
        </div>
      ) : (
        <ul className="song-list" style={{ marginTop: 18 }}>
          {songs.map((song) => (
            <li key={song.id} className="song-item">
              <Link href={`/admin/musica/${song.id}`} className="song-item__link">
                <div className="song-item__body">
                  <div className="song-item__title">
                    {song.title}
                    {!song.published && (
                      <span className="chip" style={{ marginLeft: 8, fontSize: 11 }}>
                        rascunho
                      </span>
                    )}
                  </div>
                  <div className="song-item__artist">
                    {song.artist || 'Sem artista'} · /{song.slug}
                  </div>
                  <div className="song-item__snippet">
                    {song.chords?.trim()
                      ? `${(song.available_keys ?? []).length || 1} tom(ns) publicado(s)`
                      : 'sem cifra'}
                  </div>
                </div>
                <span className="song-item__key">{normalizeKey(song.base_key)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
