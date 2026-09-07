'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import SongHeader from '@/components/SongHeader';
import SongControlPanel from '@/components/SongControlPanel';
import SongTabs, { InstrumentTabs, type SongTab } from '@/components/SongTabs';
import KeyBar from '@/components/KeyBar';
import Reader from '@/components/Reader';
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
import { getCachedSong, payloadFromServerSong, putCachedSongIfNewer } from '@/lib/song-cache';
import type { Instrumento, Song } from '@/lib/types';

type Override = { key: string; chords: string; instrumento?: Instrumento };

function pathFromLocation(pathname: string): { tab: SongTab; key: string | null; instrumento: Instrumento } {
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
  notice,
}: {
  song: Song;
  keys: string[];
  overrides: Override[];
  initialKey: string;
  instrumento?: Instrumento;
  initialTab?: SongTab;
  notice?: ReactNode;
}) {
  const [tab, setTab] = useState<SongTab>(initialTab);
  const [viewKey, setViewKey] = useState(initialKey);
  const [instrumento, setInstrumento] = useState<Instrumento>(initialInstrumento);
  const [activeSong, setActiveSong] = useState(song);
  const [activeKeys, setActiveKeys] = useState(keys);
  const [activeOverrides, setActiveOverrides] = useState(overrides);

  // Prefere cache local na primeira pintura do cliente quando o conteúdo local
  // ainda está alinhado; depois sincroniza com os props do servidor.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      const cached = await getCachedSong(song.slug);
      if (cancelled) return;

      if (cached && Date.parse(cached.updated_at) >= Date.parse(song.updated_at)) {
        setActiveSong(cached.song);
        setActiveKeys(cached.keys);
        setActiveOverrides(cached.overrides);
      } else {
        setActiveSong(song);
        setActiveKeys(keys);
        setActiveOverrides(overrides);
      }

      // Atualiza o cache só se ainda não existir ou se o servidor estiver mais novo.
      try {
        await putCachedSongIfNewer(payloadFromServerSong(song, overrides, keys));
      } catch {
        /* cache opcional */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [song, keys, overrides]);

  const instruments = availableInstruments(activeSong, activeOverrides);
  const hasGuitar = instruments.includes('violao');
  const hasChords = instruments.length > 0;

  const syncUrl = useCallback(
    (nextTab: SongTab, nextKey: string, nextInstrumento: Instrumento) => {
      const path =
        nextTab === 'letra' ? `/musica/${activeSong.slug}` : cifraPath(activeSong.slug, nextKey, nextInstrumento);
      window.history.pushState(null, '', path);
    },
    [activeSong.slug]
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
      setTab(next);
      syncUrl(next, viewKey, instrumento);
    },
    [tab, viewKey, instrumento, syncUrl]
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
      setTab(fromPath.tab);
      if (fromPath.key) setViewKey(fromPath.key);
      if (fromPath.tab === 'cifra') setInstrumento(fromPath.instrumento);
    }
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    if (tab === 'letra') {
      document.title = `${activeSong.title} — Letra · Banco de Músicas do Lyra`;
      return;
    }
    const kind = instrumento === 'violao' ? 'Cifra de violão' : 'Cifra';
    document.title = `${activeSong.title} — ${kind} em ${viewKey} · Banco de Músicas do Lyra`;
  }, [activeSong.title, viewKey, instrumento, tab]);

  const { chart, source } = useMemo(
    () => chartForKey(activeSong, activeOverrides, viewKey, instrumento),
    [activeSong, activeOverrides, viewKey, instrumento]
  );
  const chordsUsed = useMemo(() => uniqueChords(chart), [chart]);
  const manualKeys = useMemo(
    () =>
      activeOverrides
        .filter((o) => (o.instrumento ?? 'teclado') === instrumento && o.chords.trim())
        .map((o) => normalizeKey(o.key)),
    [activeOverrides, instrumento]
  );
  const lyrics = activeSong.lyrics.trim() || (activeSong.chords.trim() ? chartToLyrics(activeSong.chords) : '');

  const emptyMessage =
    instrumento === 'violao'
      ? 'Cifra de violão ainda não cadastrada para esta música'
      : 'Cifra ainda não cadastrada para esta música';

  const chordKeySlug = keyToSlug(viewKey);
  const shareTitle =
    tab === 'letra'
      ? `${activeSong.title} — ${activeSong.artist}`
      : `${activeSong.title} — cifra em ${viewKey}${instrumento === 'violao' ? ' (violão)' : ''}`;

  const tabs = (
    <SongTabs
      slug={activeSong.slug}
      active={tab}
      hasChords={hasChords}
      chordKeySlug={chordKeySlug}
      instrumento={instrumento}
      onSelect={selectTab}
    />
  );

  return (
    <>
      <SongHeader song={activeSong} currentKey={viewKey} />
      <SongControlPanel
        shareTitle={shareTitle}
        showWrap={tab === 'cifra'}
        tabs={tabs}
        keyControl={
          tab === 'cifra' ? (
            <KeyBar
              slug={activeSong.slug}
              keys={activeKeys}
              activeKey={viewKey}
              baseKey={normalizeKey(activeSong.base_key)}
              manualKeys={manualKeys}
              instrumento={instrumento}
              onSelect={selectKey}
            />
          ) : null
        }
      >
        {tab === 'cifra' ? (
          <InstrumentTabs
            slug={activeSong.slug}
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
              : `Cifra transposta automaticamente a partir do tom original (${normalizeKey(activeSong.base_key)}).`}
          </p>
        ) : null}
      </SongControlPanel>
    </>
  );
}
