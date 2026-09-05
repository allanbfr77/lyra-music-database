'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import SongHeader from '@/components/SongHeader';
import SongControlPanel from '@/components/SongControlPanel';
import SongTabs, { InstrumentTabs, type SongTab } from '@/components/SongTabs';
import KeyBar from '@/components/KeyBar';
import Reader from '@/components/Reader';
import SlidesEditor from '@/components/SlidesEditor';
import {
  availableInstruments,
  chartForKey,
  chartToLyrics,
  cifraPath,
  keyToSlug,
  normalizeKey,
  slugToKey,
  uniqueChords,
} from '@/lib/chords';
import { slidesPath } from '@/lib/slides';
import type { Instrumento, Song } from '@/lib/types';
import { playlistQuery } from '@/lib/playlist';
import PlaylistNav from '@/components/PlaylistNav';

type Override = { key: string; chords: string; instrumento?: Instrumento };

function pathFromLocation(pathname: string): { tab: SongTab; key: string | null; instrumento: Instrumento } {
  if (/\/slides\/?$/.test(pathname)) return { tab: 'slides', key: null, instrumento: 'teclado' };
  const match = pathname.match(/\/cifra\/([^/]+)(?:\/(violao))?/);
  if (!match) return { tab: 'letra', key: null, instrumento: 'teclado' };
  return {
    tab: 'cifra',
    key: slugToKey(match[1]),
    instrumento: match[2] === 'violao' ? 'violao' : 'teclado',
  };
}

export default function ChordView({
  song,
  keys,
  overrides,
  initialKey,
  instrumento: initialInstrumento = 'teclado',
  initialTab = 'cifra',
  inPlaylist = false,
  canAccessSlides = false,
  userSlides = null,
  notice,
}: {
  song: Song;
  keys: string[];
  overrides: Override[];
  initialKey: string;
  instrumento?: Instrumento;
  initialTab?: SongTab;
  inPlaylist?: boolean;
  canAccessSlides?: boolean;
  userSlides?: string[] | null;
  notice?: ReactNode;
}) {
  const [tab, setTab] = useState<SongTab>(canAccessSlides ? initialTab : initialTab === 'slides' ? 'letra' : initialTab);
  const [viewKey, setViewKey] = useState(initialKey);
  const [instrumento, setInstrumento] = useState<Instrumento>(initialInstrumento);
  const instruments = availableInstruments(song, overrides);
  const hasGuitar = instruments.includes('violao');
  const hasChords = instruments.length > 0;

  const syncUrl = useCallback(
    (nextTab: SongTab, nextKey: string, nextInstrumento: Instrumento) => {
      const path =
        nextTab === 'letra'
          ? `/musica/${song.slug}`
          : nextTab === 'slides'
            ? slidesPath(song.slug)
            : cifraPath(song.slug, nextKey, nextInstrumento);
      window.history.pushState(null, '', `${path}${playlistQuery(inPlaylist)}`);
    },
    [song.slug, inPlaylist]
  );

  const selectKey = useCallback(
    (next: string) => {
      if (next === viewKey) return;
      setViewKey(next);
      if (tab === 'cifra') syncUrl('cifra', next, instrumento);
    },
    [viewKey, tab, instrumento, syncUrl]
  );

  const selectTab = useCallback(
    (next: SongTab) => {
      if (next === tab) return;
      if (next === 'slides' && !canAccessSlides) return;
      setTab(next);
      syncUrl(next, viewKey, instrumento);
    },
    [tab, viewKey, instrumento, syncUrl, canAccessSlides]
  );

  const selectInstrumento = useCallback(
    (next: Instrumento) => {
      if (next === instrumento) return;
      setInstrumento(next);
      if (tab === 'cifra') syncUrl('cifra', viewKey, next);
    },
    [instrumento, tab, viewKey, syncUrl]
  );

  useEffect(() => {
    function syncFromUrl() {
      const fromPath = pathFromLocation(window.location.pathname);
      if (fromPath.tab === 'slides' && !canAccessSlides) {
        setTab('letra');
        return;
      }
      setTab(fromPath.tab);
      if (fromPath.key) setViewKey(fromPath.key);
      if (fromPath.tab === 'cifra') setInstrumento(fromPath.instrumento);
    }
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, [canAccessSlides]);

  useEffect(() => {
    if (tab === 'letra') {
      document.title = `${song.title} — Letra · Banco de Músicas do Lyra`;
      return;
    }
    if (tab === 'slides') {
      document.title = `${song.title} — Slides · Banco de Músicas do Lyra`;
      return;
    }
    const kind = instrumento === 'violao' ? 'Cifra de violão' : 'Cifra';
    document.title = `${song.title} — ${kind} em ${viewKey} · Banco de Músicas do Lyra`;
  }, [song.title, viewKey, instrumento, tab]);

  const { chart, source } = useMemo(
    () => chartForKey(song, overrides, viewKey, instrumento),
    [song, overrides, viewKey, instrumento]
  );
  const chordsUsed = useMemo(() => uniqueChords(chart), [chart]);
  const manualKeys = useMemo(
    () =>
      overrides
        .filter((o) => (o.instrumento ?? 'teclado') === instrumento && o.chords.trim())
        .map((o) => normalizeKey(o.key)),
    [overrides, instrumento]
  );
  const lyrics = song.lyrics.trim() || (song.chords.trim() ? chartToLyrics(song.chords) : '');

  const emptyMessage =
    instrumento === 'violao'
      ? 'Cifra de violão ainda não cadastrada para esta música'
      : 'Cifra ainda não cadastrada para esta música';

  const chordKeySlug = keyToSlug(viewKey);
  const shareTitle =
    tab === 'letra'
      ? `${song.title} — ${song.artist}`
      : tab === 'slides'
        ? `${song.title} — Slides`
        : `${song.title} — cifra em ${viewKey}${instrumento === 'violao' ? ' (violão)' : ''}`;

  const tabs = (
    <SongTabs
      slug={song.slug}
      active={tab}
      hasChords={hasChords}
      chordKeySlug={chordKeySlug}
      instrumento={instrumento}
      canAccessSlides={canAccessSlides}
      onSelect={selectTab}
    />
  );

  if (tab === 'slides' && canAccessSlides) {
    return (
      <div className="slides-page">
        <div className="slides-toolbar no-print">
          {tabs}
          <p className="slides-toolbar__title">{song.title}</p>
        </div>
        <SlidesEditor songId={song.id} savedSlides={userSlides} lyricsSeed={lyrics} />
      </div>
    );
  }

  return (
    <>
      <SongHeader song={song} currentKey={viewKey} />
      <SongControlPanel
        shareTitle={shareTitle}
        showWrap={tab === 'cifra'}
        tabs={tabs}
        keyControl={
          tab === 'cifra' ? (
            <KeyBar
              slug={song.slug}
              keys={keys}
              activeKey={viewKey}
              baseKey={normalizeKey(song.base_key)}
              manualKeys={manualKeys}
              instrumento={instrumento}
              onSelect={selectKey}
            />
          ) : null
        }
      >
        {tab === 'cifra' ? (
          <InstrumentTabs
            slug={song.slug}
            chordKeySlug={chordKeySlug}
            instrumento={instrumento}
            hasGuitar={hasGuitar || instrumento === 'violao'}
            onSelect={selectInstrumento}
          />
        ) : null}
        {tab === 'cifra' ? notice : null}
        {tab === 'letra' ? (
          lyrics ? (
            <Reader mode="lyrics" text={lyrics} />
          ) : (
            <div className="empty">
              <strong>Letra ainda não cadastrada</strong>
              <span className="small">Esta música foi cadastrada sem letra.</span>
            </div>
          )
        ) : chart.trim() ? (
          <Reader mode="chords" text={chart} />
        ) : (
          <div className="empty">
            <strong>{emptyMessage}</strong>
            <span className="small">A letra continua disponível na outra aba.</span>
          </div>
        )}
        {tab === 'cifra' && chordsUsed.length > 0 && (
          <div className="no-print">
            <div className="keybar__label">Acordes usados neste tom</div>
            <div className="song-head__meta">
              {chordsUsed.slice(0, 20).map((chord) => (
                <span key={chord} className="chord-chip">
                  {chord}
                </span>
              ))}
            </div>
          </div>
        )}
        {tab === 'cifra' && chart.trim() ? (
          <p className="hint no-print">
            {source === 'manual'
              ? `Cifra revisada manualmente para o tom de ${viewKey}.`
              : `Cifra transposta automaticamente a partir do tom original (${normalizeKey(song.base_key)}).`}
          </p>
        ) : null}
      </SongControlPanel>
      {inPlaylist && tab === 'cifra' ? <PlaylistNav slug={song.slug} /> : null}
    </>
  );
}
