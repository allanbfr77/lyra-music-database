'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import SongHeader from '@/components/SongHeader';
import SongTabs from '@/components/SongTabs';
import KeyBar from '@/components/KeyBar';
import Reader from '@/components/Reader';
import { chartForKey, keyToSlug, normalizeKey, slugToKey, uniqueChords } from '@/lib/chords';
import type { Song } from '@/lib/types';

type Override = { key: string; chords: string };

function keyFromPath(pathname: string): string | null {
  const match = pathname.match(/\/cifra\/([^/]+)/);
  return match ? slugToKey(match[1]) : null;
}

export default function ChordView({
  song,
  keys,
  overrides,
  initialKey,
  notice,
}: {
  song: Song;
  keys: string[];
  overrides: Override[];
  initialKey: string;
  notice?: ReactNode;
}) {
  const [viewKey, setViewKey] = useState(initialKey);

  const selectKey = useCallback(
    (next: string) => {
      if (next === viewKey) return;
      setViewKey(next);
      window.history.pushState(null, '', `/musica/${song.slug}/cifra/${keyToSlug(next)}`);
    },
    [song.slug, viewKey]
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
    document.title = `${song.title} — Cifra em ${viewKey} · Banco de Músicas do Lyra`;
  }, [song.title, viewKey]);

  const { chart, source } = useMemo(
    () => chartForKey(song, overrides, viewKey),
    [song, overrides, viewKey]
  );
  const chordsUsed = useMemo(() => uniqueChords(chart), [chart]);
  const manualKeys = useMemo(
    () => overrides.filter((o) => o.chords.trim()).map((o) => normalizeKey(o.key)),
    [overrides]
  );

  return (
    <>
      <SongHeader song={song} currentKey={viewKey} />
      <SongTabs slug={song.slug} active="cifra" hasChords chordKeySlug={keyToSlug(viewKey)} />
      {notice}
      <KeyBar
        slug={song.slug}
        keys={keys}
        activeKey={viewKey}
        baseKey={normalizeKey(song.base_key)}
        manualKeys={manualKeys}
        onSelect={selectKey}
      />
      <Reader mode="chords" text={chart} shareTitle={`${song.title} — cifra em ${viewKey}`} />

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

      <div className="notice no-print">
        {source === 'manual'
          ? `Cifra revisada manualmente para o tom de ${viewKey}.`
          : `Cifra transposta automaticamente a partir do tom original (${normalizeKey(song.base_key)}).`}
      </div>
    </>
  );
}
