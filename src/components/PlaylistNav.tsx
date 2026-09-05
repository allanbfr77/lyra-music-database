'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons';
import { neighborsInPlaylist, playlistItemHref, readPlaylist, type PlaylistItem } from '@/lib/playlist';

export default function PlaylistNav({
  slug,
  mode = 'cifra',
}: {
  slug: string;
  mode?: 'slides' | 'cifra';
}) {
  const [items, setItems] = useState<PlaylistItem[]>([]);

  useEffect(() => {
    setItems(readPlaylist());
  }, []);

  const { prev, next } = neighborsInPlaylist(slug, items);
  if (items.length < 2 || (!prev && !next)) return null;

  return (
    <nav className="playlist-nav no-print" aria-label="Navegação da playlist">
      {prev ? (
        <Link href={playlistItemHref(prev, mode)} className="btn playlist-nav__btn">
          <ChevronLeftIcon size={15} />
          Anterior
        </Link>
      ) : null}
      {next ? (
        <Link href={playlistItemHref(next, mode)} className="btn btn--primary playlist-nav__btn">
          Próximo
          <ChevronRightIcon size={15} />
        </Link>
      ) : null}
    </nav>
  );
}
