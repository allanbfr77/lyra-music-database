'use client';

import { useEffect, useState } from 'react';
import ChordView from '@/components/ChordView';
import { getCachedSong, type CachedSongPayload } from '@/lib/song-cache';
import type { Instrumento } from '@/lib/types';
import type { SongTab } from '@/components/SongTabs';

/**
 * Fallback de Suspense: se a música já estiver no cache local, mostra na hora
 * enquanto o servidor ainda busca a versão atualizada.
 */
export default function SongCacheFallback({
  slug,
  initialTab = 'cifra',
  initialKey,
  instrumento = 'teclado',
}: {
  slug: string;
  initialTab?: SongTab;
  initialKey?: string;
  instrumento?: Instrumento;
}) {
  const [cached, setCached] = useState<CachedSongPayload | null | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    getCachedSong(slug).then((entry) => {
      if (!cancelled) setCached(entry);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (cached === undefined) {
    return (
      <div className="empty song-cache-loading" aria-busy="true">
        <strong>Carregando…</strong>
        <span className="small">Buscando letra e cifra</span>
      </div>
    );
  }

  if (!cached) {
    return (
      <div className="empty song-cache-loading" aria-busy="true">
        <strong>Carregando…</strong>
        <span className="small">Buscando letra e cifra</span>
      </div>
    );
  }

  const key = initialKey && cached.keys.includes(initialKey) ? initialKey : cached.keys[0] ?? cached.song.base_key;

  return (
    <ChordView
      song={cached.song}
      keys={cached.keys}
      overrides={cached.overrides}
      initialKey={key}
      instrumento={instrumento}
      initialTab={initialTab}
    />
  );
}
