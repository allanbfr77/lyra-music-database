'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteSong, saveSong, type SongPayload } from '@/app/admin/actions';
import {
  allKeysFor,
  cifraPath,
  detectSongKey,
  keyDisplayName,
  normalizeKey,
  transposeChart,
  type KeyDetection,
} from '@/lib/chords';
import { slugify } from '@/lib/slug';
import type { Instrumento } from '@/lib/types';
import { ExternalLinkIcon, PencilIcon } from '@/components/icons';

// Uma grafia por altura, para que cada tom tenha um único link permanente.
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const MINOR_KEYS = ['Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m'];

export type EditorInitial = {
  id: string | null;
  slug: string;
  title: string;
  artist: string;
  lyrics: string;
  chords: string;
  chords_guitar: string;
  base_key: string;
  available_keys: string[];
  capo: number;
  tempo_bpm: number | null;
  time_signature: string | null;
  source_url: string | null;
  youtube_url: string | null;
  notes: string | null;
  published: boolean;
  overrides: { key: string; chords: string; instrumento?: Instrumento }[];
};

const EMPTY: EditorInitial = {
  id: null,
  slug: '',
  title: '',
  artist: '',
  lyrics: '',
  chords: '',
  chords_guitar: '',
  base_key: 'G',
  available_keys: [],
  capo: 0,
  tempo_bpm: null,
  time_signature: null,
  source_url: null,
  youtube_url: null,
  notes: null,
  published: true,
  overrides: [],
};

export default function SongEditor({ initial = EMPTY }: { initial?: EditorInitial }) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [artist, setArtist] = useState(initial.artist);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  const [baseKey, setBaseKey] = useState(normalizeKey(initial.base_key, 'G'));
  // Música já salva: o admin confirmou o tom. Música nova: a cifra preenche sozinha.
  const [keyTouched, setKeyTouched] = useState(Boolean(initial.id));
  const [lyrics, setLyrics] = useState(initial.lyrics);
  const [chords, setChords] = useState(initial.chords);
  const [chordsGuitar, setChordsGuitar] = useState(initial.chords_guitar ?? '');
  const [availableKeys, setAvailableKeys] = useState<string[]>(
    (initial.available_keys ?? []).map((k) => normalizeKey(k, '')).filter(Boolean)
  );
  // Música nova já nasce com os 12 tons publicados; se o admin mexer, respeitamos a escolha.
  const [keysTouched, setKeysTouched] = useState(Boolean(initial.id));
  const [capo, setCapo] = useState(initial.capo ?? 0);
  const [bpm, setBpm] = useState<string>(initial.tempo_bpm ? String(initial.tempo_bpm) : '');
  const [timeSignature, setTimeSignature] = useState(initial.time_signature ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial.source_url ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtube_url ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [published, setPublished] = useState(initial.published);

  const [overridesByInst, setOverridesByInst] = useState<Record<Instrumento, Record<string, string>>>(() => {
    const teclado: Record<string, string> = {};
    const violao: Record<string, string> = {};
    for (const o of initial.overrides) {
      const inst: Instrumento = o.instrumento === 'violao' ? 'violao' : 'teclado';
      (inst === 'violao' ? violao : teclado)[normalizeKey(o.key)] = o.chords;
    }
    return { teclado, violao };
  });

  const [tab, setTab] = useState<'letra' | 'cifra'>('letra');
  const [instrumentTab, setInstrumentTab] = useState<Instrumento>('teclado');
  const [tuningKey, setTuningKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const effectiveSlug = slugTouched ? slugify(slug || title) : slugify(title);
  const detectedKey = useMemo(
    () => detectSongKey(chords, chordsGuitar),
    [chords, chordsGuitar]
  );

  useEffect(() => {
    if (!detectedKey || keyTouched) return;
    if (detectedKey.confidence === 'low') return;
    const next = normalizeKey(detectedKey.key);
    if (next !== normalizeKey(baseKey)) setBaseKey(next);
  }, [detectedKey, keyTouched, baseKey]);

  const twelveKeys = useMemo(() => allKeysFor(baseKey), [baseKey]);
  const effectiveKeys = useMemo(
    () => (keysTouched ? availableKeys : twelveKeys.filter((k) => k !== normalizeKey(baseKey))),
    [keysTouched, availableKeys, twelveKeys, baseKey]
  );
  const publishedSet = useMemo(
    () => new Set([normalizeKey(baseKey), ...effectiveKeys]),
    [baseKey, effectiveKeys]
  );

  function toggleKey(key: string) {
    if (key === normalizeKey(baseKey)) return;
    const current = effectiveKeys;
    setKeysTouched(true);
    setAvailableKeys(current.includes(key) ? current.filter((k) => k !== key) : [...current, key]);
  }

  const activeChords = instrumentTab === 'violao' ? chordsGuitar : chords;
  const overrides = overridesByInst[instrumentTab];

  function setActiveChords(value: string) {
    if (instrumentTab === 'violao') setChordsGuitar(value);
    else setChords(value);
  }

  function patchOverrides(updater: (prev: Record<string, string>) => Record<string, string>) {
    setOverridesByInst((prev) => ({ ...prev, [instrumentTab]: updater(prev[instrumentTab]) }));
  }

  const tunedChart =
    tuningKey !== null
      ? overrides[tuningKey] ?? transposeChart(activeChords, normalizeKey(baseKey), tuningKey)
      : '';

  async function onSave() {
    if (busy || !title.trim()) return;
    setBusy(true);
    setError(null);

    const payload: SongPayload = {
      id: initial.id,
      slug: effectiveSlug,
      title,
      artist,
      lyrics,
      chords,
      chords_guitar: chordsGuitar,
      base_key: normalizeKey(
        !keyTouched && detectedKey && detectedKey.confidence !== 'low'
          ? detectedKey.key
          : baseKey
      ),
      available_keys: effectiveKeys,
      capo,
      tempo_bpm: bpm.trim() ? Number(bpm) : null,
      time_signature: timeSignature || null,
      source_url: sourceUrl || null,
      youtube_url: youtubeUrl || null,
      notes: notes || null,
      published,
      overrides: (['teclado', 'violao'] as Instrumento[]).flatMap((inst) =>
        Object.entries(overridesByInst[inst]).map(([key, value]) => ({ key, chords: value, instrumento: inst }))
      ),
    };

    const result = await saveSong(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    pendingHref.current = initial.id ? null : `/admin/musica/${result.id}`;
    setSavedOpen(true);
  }

  function dismissSaved() {
    setSavedOpen(false);
    const href = pendingHref.current;
    pendingHref.current = null;
    if (href) router.replace(href);
    else router.refresh();
  }

  useEffect(() => {
    if (savedOpen) okRef.current?.focus();
  }, [savedOpen]);

  async function onDelete() {
    if (!initial.id) return;
    if (!window.confirm(`Excluir "${title}" definitivamente?`)) return;
    setBusy(true);
    const result = await deleteSong(initial.id);
    setBusy(false);
    if (!result.ok) {
      setError(result.error ?? 'Erro ao excluir.');
      return;
    }
    router.replace('/admin');
    router.refresh();
  }

  return (
    <main className="shell">
      <div style={{ padding: '20px 0 4px' }}>
        <h1 style={{ fontSize: 22 }}>{initial.id ? 'Editar música' : 'Nova música'}</h1>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card">
        <label className="field">
          <span className="field__label">Música</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Galileu"
            required
          />
        </label>

        <label className="field">
          <span className="field__label">Artista</span>
          <input
            className="input"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
            placeholder="Fernandinho"
          />
        </label>

        <label className="field">
          <span className="field__label">Endereço no site</span>
          <input
            className="input"
            value={slugTouched ? slug : effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
            placeholder="galileu"
          />
        </label>

        <label className="field">
          <span className="field__label">YouTube</span>
          <input
            className="input"
            inputMode="url"
            autoComplete="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
          />
        </label>

        <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          <span className="field__label" style={{ margin: 0 }}>
            Publicada (visível para todos e para o Lyra)
          </span>
        </label>
      </div>

      <nav className="tabs" style={{ marginTop: 22, position: 'static' }}>
        <button className="tab" data-active={tab === 'letra'} onClick={() => setTab('letra')} type="button">
          Letra
        </button>
        <button className="tab" data-active={tab === 'cifra'} onClick={() => setTab('cifra')} type="button">
          Cifra
        </button>
      </nav>

      {tab === 'letra' ? (
        <div style={{ paddingTop: 16 }}>
          <label className="field">
            <textarea
              className="textarea"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={18}
              aria-label="Letra"
              placeholder={'Tu és o Deus de toda a terra\nE nada é impossível pra Ti…'}
            />
          </label>
        </div>
      ) : (
        <div style={{ paddingTop: 16 }}>
          <div className="cifra-editor">
            <div className="cifra-editor__toolbar">
              <nav className="seg" aria-label="Instrumento da cifra">
                <button
                  className="seg__item"
                  data-active={instrumentTab === 'teclado'}
                  onClick={() => setInstrumentTab('teclado')}
                  type="button"
                >
                  Teclado
                </button>
                <button
                  className="seg__item"
                  data-active={instrumentTab === 'violao'}
                  onClick={() => setInstrumentTab('violao')}
                  type="button"
                >
                  Violão
                </button>
              </nav>

              <div className="cifra-editor__meta">
              <label className="cifra-editor__key">
                <span className="cifra-editor__key-label">Tom</span>
                <select
                  className="select cifra-editor__key-select"
                  value={normalizeKey(baseKey)}
                  aria-label="Tom original da cifra"
                  onChange={(e) => {
                    setKeyTouched(true);
                    setBaseKey(e.target.value);
                  }}
                >
                  <optgroup label="Maior">
                    {MAJOR_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {keyDisplayName(k)}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Menor">
                    {MINOR_KEYS.map((k) => (
                      <option key={k} value={k}>
                        {keyDisplayName(k)}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </label>
              <label className="cifra-editor__key">
                <span className="cifra-editor__key-label">Capotraste</span>
                <input
                  className="input cifra-editor__capo"
                  type="number"
                  min={0}
                  max={12}
                  value={capo}
                  aria-label="Capotraste"
                  onChange={(e) => setCapo(Number(e.target.value))}
                />
              </label>
              </div>
            </div>

            <textarea
              className="textarea textarea--mono cifra-editor__body"
              value={activeChords}
              onChange={(e) => setActiveChords(e.target.value)}
              rows={16}
              spellCheck={false}
              aria-label={`Cifra de ${instrumentTab === 'violao' ? 'violão' : 'teclado'}`}
              placeholder={'[Intro] G  D  Em  C\n\nG            D/F#      Em\nTu és o Deus de toda a terra'}
            />

            <div className="cifra-editor__status">
              <KeyDetectionHint
                detection={detectedKey}
                currentKey={baseKey}
                onApply={(key) => {
                  setKeyTouched(true);
                  setBaseKey(key);
                }}
              />
            </div>
          </div>

          <div className="field">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <span className="field__label" style={{ margin: 0 }}>
                Tons disponíveis
              </span>
              <span className="header-spacer" />
              <button
                type="button"
                className="btn btn--sm"
                onClick={() => { setKeysTouched(true); setAvailableKeys(twelveKeys.filter((k) => k !== normalizeKey(baseKey))); }}
              >
                Marcar os 12
              </button>
              <button type="button" className="btn btn--sm" onClick={() => { setKeysTouched(true); setAvailableKeys([]); }}>
                Só o original
              </button>
            </div>
            <div className="keys-grid">
              {twelveKeys.map((key) => {
                const isBase = key === normalizeKey(baseKey);
                return (
                  <button
                    key={key}
                    type="button"
                    className="key-toggle"
                    data-on={publishedSet.has(key)}
                    data-base={isBase}
                    onClick={() => toggleKey(key)}
                    title={isBase ? 'Tom original — sempre publicado' : 'Publicar/despublicar este tom'}
                  >
                    {key}
                    {overrides[key] ? <PencilIcon size={12} /> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="field">
            <span className="field__label">Ajuste manual de um tom (opcional)</span>
            <select
              className="select"
              value={tuningKey ?? ''}
              onChange={(e) => setTuningKey(e.target.value || null)}
            >
              <option value="">Selecione um tom para revisar…</option>
              {twelveKeys
                .filter((k) => k !== normalizeKey(baseKey) && (publishedSet.has(k) || overrides[k]))
                .map((k) => (
                  <option key={k} value={k}>
                    {k}
                    {overrides[k] ? ' — manual' : ' — automático'}
                    {!publishedSet.has(k) ? ' (tom despublicado)' : ''}
                  </option>
                ))}
            </select>
          </div>

          {tuningKey && (
            <div className="card" style={{ marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <strong style={{ fontSize: 15 }}>Cifra em {tuningKey}</strong>
                <span className="chip">{overrides[tuningKey] ? 'manual' : 'automática'}</span>
                <span className="header-spacer" />
                {overrides[tuningKey] && (
                  <button
                    type="button"
                    className="btn btn--sm"
                    onClick={() =>
                      patchOverrides((prev) => {
                        const next = { ...prev };
                        delete next[tuningKey];
                        return next;
                      })
                    }
                  >
                    Voltar ao automático
                  </button>
                )}
              </div>
              <textarea
                className="textarea textarea--mono"
                rows={14}
                spellCheck={false}
                value={tunedChart}
                onChange={(e) => patchOverrides((prev) => ({ ...prev, [tuningKey]: e.target.value }))}
              />
            </div>
          )}
        </div>
      )}

      <div className="sticky-actions">
        <button className="btn btn--primary" onClick={onSave} disabled={busy || !title.trim()} type="button">
          {busy ? 'Salvando...' : 'Salvar'}
        </button>
        {initial.id && (
          <>
            <Link
              className="btn"
              href={
                (instrumentTab === 'violao' ? chordsGuitar : chords).trim()
                  ? cifraPath(effectiveSlug, normalizeKey(baseKey), instrumentTab)
                  : `/musica/${effectiveSlug}`
              }
              target="_blank"
            >
              Ver no site
              <ExternalLinkIcon size={13} />
            </Link>
            <button className="btn btn--danger" onClick={onDelete} disabled={busy} type="button">
              Excluir
            </button>
          </>
        )}
      </div>
      {savedOpen && (
        <div className="dialog-backdrop">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="saved-title" aria-describedby="saved-desc">
            <strong id="saved-title">Música salva</strong>
            <p id="saved-desc">A música foi salva com sucesso.</p>
            <button ref={okRef} className="btn btn--primary" type="button" onClick={dismissSaved}>
              OK
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function KeyDetectionHint({
  detection,
  currentKey,
  onApply,
}: {
  detection: KeyDetection | null;
  currentKey: string;
  onApply: (key: string) => void;
}) {
  if (!detection) {
    return null;
  }

  const detected = normalizeKey(detection.key);
  const current = normalizeKey(currentKey);
  const matches = detected === current;
  const possible = detection.confidence !== 'high';
  const label = possible
    ? `Possível tom: ${keyDisplayName(detected)}`
    : `Tom detectado: ${keyDisplayName(detected)}`;
  const alt =
    detection.alternatives.length > 0
      ? ` Também combina com ${detection.alternatives.map((k) => keyDisplayName(k)).join(', ')}.`
      : '';

  return (
    <span className="key-detect" data-confidence={detection.confidence} data-match={matches}>
      {matches ? (
        <>
          {label}. O texto da cifra permanece como foi colado.
          {possible ? ' Corrija o Tom se a cifra for ambígua.' : ''}
          {alt}
        </>
      ) : (
        <>
          {label}.{alt}
          <button type="button" className="key-detect__apply" onClick={() => onApply(detected)}>
            Usar este tom
          </button>
        </>
      )}
    </span>
  );
}
