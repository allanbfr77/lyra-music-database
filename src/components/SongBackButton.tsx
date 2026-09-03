'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ChevronLeftIcon } from '@/components/icons';
import { isPlaylistQuery, PLAYLIST_QUERY } from '@/lib/playlist';

export default function SongBackButton() {
  const params = useSearchParams();
  const href = isPlaylistQuery(params.get(PLAYLIST_QUERY)) ? '/playlist' : '/';
  const label = href === '/playlist' ? 'Voltar para a playlist' : 'Voltar';

  return (
    <Link href={href} className="back-btn" aria-label={label}>
      <ChevronLeftIcon size={18} />
    </Link>
  );
}
