'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { deleteSong, saveSong, type SongPayload } from '@/app/admin/actions';
import { allKeysFor, keyToSlug, normalizeKey, transposeChart } from '@/lib/chords';
import { slugify } from '@/lib/slug';
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
  base_key: string;
  available_keys: string[];
  capo: number;
  tempo_bpm: number | null;
  time_signature: string | null;
  source_url: string | null;
  youtube_url: string | null;
  notes: string | null;
  published: boolean;
  overrides: { key: string; chords: string }[];
};

const EMPTY: EditorInitial = {
  id: null,
  slug: '',
  title: '',
  artist: '',
  lyrics: '',
  chords: '',
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
  const [lyrics, setLyrics] = useState(initial.lyrics);
  const [chords, setChords] = useState(initial.chords);
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

  const [overrides, setOverrides] = useState<Record<string, string>>(() =>
    Object.fromEntries(initial.overrides.map((o) => [normalizeKey(o.key), o.chords]))
  );

  const [tab, setTab] = useState<'letra' | 'cifra'>('letra');
  const [tuningKey, setTuningKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);

  const effectiveSlug = slugTouched ? slugify(slug || title) : slugify(title);
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

  const tunedChart =
    tuningKey !== null
      ? overrides[tuningKey] ?? transposeChart(chords, normalizeKey(baseKey), tuningKey)
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
      base_key: normalizeKey(baseKey),
      available_keys: effectiveKeys,
      capo,
      tempo_bpm: bpm.trim() ? Number(bpm) : null,
      time_signature: timeSignature || null,
      source_url: sourceUrl || null,
      youtube_url: youtubeUrl || null,
      notes: notes || null,
      published,
      overrides: Object.entries(overrides).map(([key, value]) => ({ key, chords: value })),
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
          <span className="field__label">Música *</span>
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

        <div className="row">
          <label className="field">
            <span className="field__label">Tom original</span>
            <select className="select" value={normalizeKey(baseKey)} onChange={(e) => setBaseKey(e.target.value)}>
              <optgroup label="Maior">
                {MAJOR_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Menor">
                {MINOR_KEYS.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </optgroup>
            </select>
            <span className="field__hint">O tom em que você digitou a cifra.</span>
          </label>

          <label className="field">
            <span className="field__label">Capotraste</span>
            <input
              className="input"
              type="number"
              min={0}
              max={12}
              value={capo}
              onChange={(e) => setCapo(Number(e.target.value))}
            />
          </label>
        </div>

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
          <span className="field__hint">
            /musica/<b>{effectiveSlug || 'galileu'}</b> — não mude depois de divulgar o link.
          </span>
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
          <span className="field__hint">
            Se preencher, a página da música mostra o ícone do YouTube com este vídeo.
          </span>
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
            <span className="field__label">Letra</span>
            <textarea
              className="textarea"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={18}
              placeholder={'Tu és o Deus de toda a terra\nE nada é impossível pra Ti…'}
            />
            <span className="field__hint">Só a letra, sem acordes. É por aqui que a busca por trecho funciona.</span>
          </label>
        </div>
      ) : (
        <div style={{ paddingTop: 16 }}>
          <label className="field">
            <span className="field__label">Cifra no tom de {normalizeKey(baseKey)}</span>
            <textarea
              className="textarea textarea--mono"
              value={chords}
              onChange={(e) => setChords(e.target.value)}
              rows={16}
              spellCheck={false}
              placeholder={'[Intro] G  D  Em  C\n\nG            D/F#      Em\nTu és o Deus de toda a terra'}
            />
            <span className="field__hint">
              Acordes em linhas próprias, acima da letra. Os demais tons saem daqui automaticamente.
            </span>
          </label>

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
            <span className="field__hint">
              Cada tom marcado aparece na faixa “Tom” do site e ganha uma URL própria e permanente. O lápis
              indica ajuste manual.
            </span>
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
            <span className="field__hint">
              Abre a transposição automática já pronta. Se você editar, aquele tom passa a usar sua versão.
            </span>
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
                      setOverrides((prev) => {
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
                onChange={(e) => setOverrides((prev) => ({ ...prev, [tuningKey]: e.target.value }))}
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
              href={chords.trim() ? `/musica/${effectiveSlug}/cifra/${keyToSlug(normalizeKey(baseKey))}` : `/musica/${effectiveSlug}`}
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
