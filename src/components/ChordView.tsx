'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import SongHeader from '@/components/SongHeader';
import SongControlPanel from '@/components/SongControlPanel';
import SongTabs, { InstrumentTabs } from '@/components/SongTabs';
import KeyBar from '@/components/KeyBar';
import Reader from '@/components/Reader';
import {
  availableInstruments,
  chartForKey,
  cifraPath,
  keyToSlug,
  normalizeKey,
  slugToKey,
  uniqueChords,
} from '@/lib/chords';
import type { Instrumento, Song } from '@/lib/types';

type Override = { key: string; chords: string; instrumento?: Instrumento };

function keyFromPath(pathname: string): string | null {
  const match = pathname.match(/\/cifra\/([^/]+)/);
  return match ? slugToKey(match[1]) : null;
}

export default function ChordView({
  song,
  keys,
  overrides,
  initialKey,
  instrumento = 'teclado',
  notice,
}: {
  song: Song;
  keys: string[];
  overrides: Override[];
  initialKey: string;
  instrumento?: Instrumento;
  notice?: ReactNode;
}) {
  const [viewKey, setViewKey] = useState(initialKey);
  const hasGuitar = availableInstruments(song, overrides).includes('violao');

  const selectKey = useCallback(
    (next: string) => {
      if (next === viewKey) return;
      setViewKey(next);
      window.history.pushState(null, '', cifraPath(song.slug, next, instrumento));
    },
    [song.slug, viewKey, instrumento]
  );

  // Voltar/avançar do navegador: o endereço já mudou, só alinhamos o tom visível.
  useEffect(() => {
    function syncFromUrl() {
      const fromPath = keyFromPath(window.location.pathname);
      if (fromPath) setViewKey(fromPath);
    }
    window.addEventListener('popstate', syncFromUrl);
    return () => window.removeEventListener('popstate', syncFromUrl);
  }, []);

  useEffect(() => {
    const kind = instrumento === 'violao' ? 'Cifra de violão' : 'Cifra';
    document.title = `${song.title} — ${kind} em ${viewKey} · Banco de Músicas do Lyra`;
  }, [song.title, viewKey, instrumento]);

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

  const emptyMessage =
    instrumento === 'violao'
      ? 'Cifra de violão ainda não cadastrada para esta música'
      : 'Cifra ainda não cadastrada para esta música';

  const chordKeySlug = keyToSlug(viewKey);
  const shareTitle = `${song.title} — cifra em ${viewKey}${instrumento === 'violao' ? ' (violão)' : ''}`;

  return (
    <>
      <SongHeader song={song} currentKey={viewKey} />
      <SongControlPanel
        shareTitle={shareTitle}
        showWrap
        tabs={
          <SongTabs
            slug={song.slug}
            active="cifra"
            hasChords
            chordKeySlug={chordKeySlug}
            instrumento={instrumento}
          />
        }
        keyControl={
          <KeyBar
            slug={song.slug}
            keys={keys}
            activeKey={viewKey}
            baseKey={normalizeKey(song.base_key)}
            manualKeys={manualKeys}
            instrumento={instrumento}
            onSelect={selectKey}
          />
        }
      >
        <InstrumentTabs
          slug={song.slug}
          chordKeySlug={chordKeySlug}
          instrumento={instrumento}
          hasGuitar={hasGuitar || instrumento === 'violao'}
        />
        {notice}
        {chart.trim() ? (
          <Reader mode="chords" text={chart} />
        ) : (
          <div className="empty">
            <strong>{emptyMessage}</strong>
            <span className="small">A letra continua disponível na outra aba.</span>
          </div>
        )}
        {chordsUsed.length > 0 && (
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
        {chart.trim() ? (
          <p className="hint no-print">
            {source === 'manual'
              ? `Cifra revisada manualmente para o tom de ${viewKey}.`
              : `Cifra transposta automaticamente a partir do tom original (${normalizeKey(song.base_key)}).`}
          </p>
        ) : null}
      </SongControlPanel>
    </>
  );
}
