'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { saveCustomSlides } from '@/app/slides/actions';
import PlaylistNav from '@/components/PlaylistNav';
import SlidesEditor from '@/components/SlidesEditor';
import { lyricsToSlides } from '@/lib/slides';
import {
  isCustomPlaylistItem,
  readPlaylist,
  writePlaylist,
  type PlaylistItem,
} from '@/lib/playlist';
import type { CustomSlideEdition } from '@/lib/user-slides';

export default function CustomPlaylistSlides({
  id,
  initial,
}: {
  id: string;
  initial: CustomSlideEdition | null;
}) {
  const [item, setItem] = useState<PlaylistItem | null>(null);
  const [ready, setReady] = useState(false);
  const [lyricsOpen, setLyricsOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [edition, setEdition] = useState(initial);
  const itemRef = useRef<PlaylistItem | null>(null);

  useEffect(() => {
    const found = readPlaylist().find((row) => row.id === id && isCustomPlaylistItem(row)) ?? null;
    const lyrics = initial?.sourceLyrics ?? found?.customLyrics ?? '';
    const slides = initial?.slides?.length ? initial.slides : found?.customSlides ?? null;
    const title = initial?.title ?? found?.title ?? 'Música em branco';

    if (found) {
      const merged: PlaylistItem = {
        ...found,
        title,
        customLyrics: lyrics,
        customSlides: slides,
      };
      itemRef.current = merged;
      setItem(merged);
      writePlaylist(readPlaylist().map((row) => (row.id === id ? merged : row)));
    } else if (initial) {
      const created: PlaylistItem = {
        id: initial.id,
        slug: `custom-${initial.id}`,
        title: initial.title,
        artist: 'Só nesta playlist',
        base_key: 'C',
        playlist_key: 'C',
        available_keys: [],
        has_chords: false,
        custom: true,
        customLyrics: initial.sourceLyrics,
        customSlides: initial.slides,
      };
      itemRef.current = created;
      setItem(created);
    } else {
      itemRef.current = null;
      setItem(null);
    }

    setDraft(lyrics);
    setLyricsOpen(!lyrics.trim());
    setEdition(initial);
    setReady(true);
  }, [id, initial]);

  useEffect(() => {
    itemRef.current = item;
  }, [item]);

  const persistItem = useCallback(
    async (patch: Partial<PlaylistItem>) => {
      const base = itemRef.current;
      if (!base) return null;
      const current = readPlaylist();
      const exists = current.some((row) => row.id === id);
      const merged = { ...base, ...patch };
      const next = exists ? current.map((row) => (row.id === id ? merged : row)) : [...current, merged];
      writePlaylist(next);
      itemRef.current = merged;
      setItem(merged);
      await saveCustomSlides({
        id,
        title: merged.title,
        sourceLyrics: merged.customLyrics ?? '',
        slides: merged.customSlides ?? lyricsToSlides(merged.customLyrics ?? ''),
      });
      return merged;
    },
    [id]
  );

  function applyLyrics() {
    const lyrics = draft.replace(/\r\n/g, '\n');
    persistItem({ customLyrics: lyrics, customSlides: lyricsToSlides(lyrics) });
    setLyricsOpen(false);
  }

  function persistSlides(slides: string[]) {
    return persistItem({ customSlides: slides }).then(() => undefined);
  }

  if (!ready) return null;

  if (!item) {
    return (
      <div className="slides-page">
        <div className="empty" style={{ margin: 32 }}>
          <strong>Música personalizada não encontrada</strong>
          <span className="small">Ela existe só nesta playlist e nesta conta.</span>
          <Link href="/playlist" className="btn btn--primary" style={{ marginTop: 16 }}>
            Voltar para a playlist
          </Link>
        </div>
      </div>
    );
  }

  const lyrics = item.customLyrics ?? '';
  const slides = item.customSlides ?? null;

  return (
    <div className="slides-page">
      <SlidesEditor
        key={`${item.id}:${lyrics}`}
        songId={item.id}
        savedSlides={slides}
        lyricsSeed={lyrics}
        showSourceControls={false}
        onPersist={persistSlides}
        emptyHint="Cole a letra acima e toque em Usar esta letra nos slides. Separe as estrofes com uma linha em branco."
        publishKind="custom"
        editionTitle={item.title}
        publishedSlides={edition?.publishedSlides ?? null}
        publishedAt={edition?.publishedAt ?? null}
        toolbarTrailing={<p className="slides-toolbar__title">{item.title || 'Música em branco'}</p>}
      >
        <div className="slides-source no-print slides-source--alt">
          <p>
            Música personalizada <strong>desta conta</strong> — não altera o catálogo. Só vai para o Lyra se você
            enviar.
          </p>
          <div className="slides-source__actions">
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setLyricsOpen((open) => !open)}>
              {lyricsOpen ? 'Fechar letra' : 'Editar letra'}
            </button>
          </div>
          {lyricsOpen ? (
            <label className="field" style={{ marginTop: 12, marginBottom: 0 }}>
              <span className="field__label">Letra do medley ou sequência</span>
              <textarea
                className="textarea"
                rows={8}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Cole os trechos. Separe as estrofes com uma linha em branco."
              />
              <span className="field__hint">Isso gera os slides desta faixa. A letra original das músicas do banco não muda.</span>
              <div className="slides-source__actions">
                <button type="button" className="btn btn--primary btn--sm" onClick={applyLyrics}>
                  Usar esta letra nos slides
                </button>
              </div>
            </label>
          ) : null}
        </div>
      </SlidesEditor>
      <PlaylistNav slug={item.slug} mode="slides" />
    </div>
  );
}
