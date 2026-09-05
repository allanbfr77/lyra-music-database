import type { MouseEvent } from 'react';
import Link from 'next/link';
import { cifraPath, slugToKey } from '@/lib/chords';
import { slidesPath } from '@/lib/slides';
import type { Instrumento } from '@/lib/types';

export type SongTab = 'letra' | 'cifra' | 'slides';

function sameTabClick(
  event: MouseEvent<HTMLAnchorElement>,
  onSelect?: () => void
) {
  if (!onSelect) return;
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  event.preventDefault();
  onSelect();
}

export default function SongTabs({
  slug,
  active,
  chordKeySlug,
  hasChords,
  instrumento = 'teclado',
  canAccessSlides = false,
  onSelect,
}: {
  slug: string;
  active: SongTab;
  chordKeySlug: string;
  hasChords: boolean;
  instrumento?: Instrumento;
  hasGuitar?: boolean;
  canAccessSlides?: boolean;
  onSelect?: (tab: SongTab) => void;
}) {
  const key = slugToKey(chordKeySlug) ?? chordKeySlug;
  const cifraHref = hasChords ? cifraPath(slug, key, instrumento) : null;

  return (
    <nav className={`seg no-print${canAccessSlides ? ' seg--3' : ''}`} aria-label={canAccessSlides ? 'Letra, cifra ou slides' : 'Letra ou cifra'}>
      <Link
        href={`/musica/${slug}`}
        className="seg__item"
        data-active={active === 'letra'}
        onClick={(event) => sameTabClick(event, onSelect ? () => onSelect('letra') : undefined)}
      >
        Letra
      </Link>
      {cifraHref ? (
        <Link
          href={cifraHref}
          className="seg__item"
          data-active={active === 'cifra'}
          onClick={(event) => sameTabClick(event, onSelect ? () => onSelect('cifra') : undefined)}
        >
          Cifra
        </Link>
      ) : (
        <span className="seg__item" style={{ opacity: 0.45 }}>
          Cifra
        </span>
      )}
      {canAccessSlides ? (
        <Link
          href={slidesPath(slug)}
          className="seg__item"
          data-active={active === 'slides'}
          onClick={(event) => sameTabClick(event, onSelect ? () => onSelect('slides') : undefined)}
        >
          Slides
        </Link>
      ) : null}
    </nav>
  );
}

export function InstrumentTabs({
  slug,
  chordKeySlug,
  instrumento = 'teclado',
  hasGuitar = false,
  onSelect,
}: {
  slug: string;
  chordKeySlug: string;
  instrumento?: Instrumento;
  hasGuitar?: boolean;
  onSelect?: (instrumento: Instrumento) => void;
}) {
  if (!hasGuitar) return null;
  const key = slugToKey(chordKeySlug) ?? chordKeySlug;

  return (
    <nav className="instrument-tabs no-print" aria-label="Instrumento">
      <Link
        href={cifraPath(slug, key, 'teclado')}
        className="tab"
        data-active={instrumento === 'teclado'}
        onClick={(event) => sameTabClick(event, onSelect ? () => onSelect('teclado') : undefined)}
      >
        Teclado
      </Link>
      <Link
        href={cifraPath(slug, key, 'violao')}
        className="tab"
        data-active={instrumento === 'violao'}
        onClick={(event) => sameTabClick(event, onSelect ? () => onSelect('violao') : undefined)}
      >
        Violão
      </Link>
    </nav>
  );
}
