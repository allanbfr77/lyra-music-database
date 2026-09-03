'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { neighborsInPlaylist, playlistSongHref, readPlaylist, type PlaylistItem } from '@/lib/playlist';

export default function PlaylistNav({ slug }: { slug: string }) {
  const [items, setItems] = useState<PlaylistItem[]>([]);

  useEffect(() => {
    setItems(readPlaylist());
  }, []);

  const { prev, next } = neighborsInPlaylist(slug, items);
  if (items.length < 2 || (!prev && !next)) return null;

  return (
    <nav className="playlist-nav no-print" aria-label="Navegação da playlist">
      {prev ? (
        <Link href={playlistSongHref(prev)} className="btn playlist-nav__btn">
          <ChevronLeftIcon size={18} />
          Anterior
        </Link>
      ) : null}
      {next ? (
        <Link href={playlistSongHref(next)} className="btn btn--primary playlist-nav__btn">
          Próximo
          <ChevronRightIcon size={18} />
        </Link>
      ) : null}
    </nav>
  );
}
