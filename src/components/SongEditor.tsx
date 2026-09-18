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
  type KeyDetection,
} from '@/lib/chords';
import { slugify } from '@/lib/slug';
import type { Instrumento } from '@/lib/types';
import { ExternalLinkIcon, CheckIcon, PlusIcon, AlertTriangleIcon } from '@/components/icons';

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
  chords_reviewed: boolean;
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
  chords_reviewed: false,
  overrides: [],
};

/**
 * Diz se o tom salvo de uma música existente foi escolhido pelo admin (e deve travar o
 * detector automático). Não conta como escolha:
 * - música sem cifra salva — o tom é só o padrão do formulário;
 * - tom salvo igual ao detectado — ele veio do próprio detector, então segue a cifra;
 * - tom padrão do formulário (G) divergente da cifra — nunca foi escolhido de verdade.
 */
function isSavedKeyConfirmed(initial: EditorInitial): boolean {
  if (!initial.id) return false;
  const detection = detectSongKey(initial.chords ?? '', initial.chords_guitar ?? '');
  if (!detection) return false;
  const saved = normalizeKey(initial.base_key, EMPTY.base_key);
  if (saved === normalizeKey(detection.key)) return false;
  return saved !== normalizeKey(EMPTY.base_key);
}

/**
 * Tom exibido ao abrir o editor. O banco exige um tom, então música sem tom definido
 * fica gravada com o padrão (G); aqui ela abre sem tom ("A detectar") até a cifra indicar um.
 * G só é mantido quando foi escolhido de outra forma: bate com a cifra salva.
 */
function initialBaseKey(initial: EditorInitial): string {
  if (!initial.id) return '';
  const saved = normalizeKey(initial.base_key, EMPTY.base_key);
  if (saved !== normalizeKey(EMPTY.base_key)) return saved;
  const detection = detectSongKey(initial.chords ?? '', initial.chords_guitar ?? '');
  return detection && normalizeKey(detection.key) === saved ? saved : '';
}

export default function SongEditor({ initial = EMPTY }: { initial?: EditorInitial }) {
  const router = useRouter();

  const [title, setTitle] = useState(initial.title);
  const [artist, setArtist] = useState(initial.artist);
  const [slug, setSlug] = useState(initial.slug);
  const [slugTouched, setSlugTouched] = useState(Boolean(initial.slug));
  // '' = tom ainda não definido (exibido como "A detectar").
  const [baseKey, setBaseKey] = useState(() => initialBaseKey(initial));
  // Música nova: a cifra preenche o tom sozinha. Música já salva: só respeitamos o tom
  // salvo como escolha do admin quando ele de fato diverge da cifra e não é o padrão (G).
  const [keyTouched, setKeyTouched] = useState(() => isSavedKeyConfirmed(initial));
  const [lyrics, setLyrics] = useState(initial.lyrics);
  const [chords, setChords] = useState(initial.chords);
  const [chordsGuitar, setChordsGuitar] = useState(initial.chords_guitar ?? '');
  const [capo, setCapo] = useState(initial.capo ?? 0);
  const [bpm, setBpm] = useState<string>(initial.tempo_bpm ? String(initial.tempo_bpm) : '');
  const [timeSignature, setTimeSignature] = useState(initial.time_signature ?? '');
  const [sourceUrl, setSourceUrl] = useState(initial.source_url ?? '');
  const [youtubeUrl, setYoutubeUrl] = useState(initial.youtube_url ?? '');
  const [notes, setNotes] = useState(initial.notes ?? '');
  const [published, setPublished] = useState(initial.published);
  // Ausente/false = Revisar (nunca assume Revisada por omissão).
  const [chordsReviewed, setChordsReviewed] = useState(Boolean(initial.chords_reviewed));

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
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [savedOpen, setSavedOpen] = useState(false);
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const pendingHref = useRef<string | null>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const duplicateOkRef = useRef<HTMLButtonElement>(null);

  const baseKeyNorm = baseKey ? normalizeKey(baseKey) : '';
  const effectiveSlug = slugTouched ? slugify(slug || title) : slugify(title);
  const detectedKey = useMemo(
    () => detectSongKey(chords, chordsGuitar),
    [chords, chordsGuitar]
  );

  useEffect(() => {
    if (!detectedKey || keyTouched) return;
    if (detectedKey.confidence === 'low') return;
    const next = normalizeKey(detectedKey.key);
    if (next !== baseKeyNorm) setBaseKey(next);
  }, [detectedKey, keyTouched, baseKeyNorm]);

  async function onSave() {
    if (busy || !title.trim()) return;
    setBusy(true);
    setError(null);

    const resolvedBase = normalizeKey(
      !keyTouched && detectedKey && detectedKey.confidence !== 'low'
        ? detectedKey.key
        : baseKey,
      EMPTY.base_key
    );

    const payload: SongPayload = {
      id: initial.id,
      slug: effectiveSlug,
      title,
      artist,
      lyrics,
      chords,
      chords_guitar: chordsGuitar,
      base_key: resolvedBase,
      // Coluna legado: grava os 12 tons (exceto o base). A seleção pública não filtra mais por ela.
      available_keys: allKeysFor(resolvedBase).filter((k) => k !== resolvedBase),
      capo,
      tempo_bpm: bpm.trim() ? Number(bpm) : null,
      time_signature: timeSignature || null,
      source_url: sourceUrl || null,
      youtube_url: youtubeUrl || null,
      notes: notes || null,
      published,
      chords_reviewed: chordsReviewed,
      overrides: (['teclado', 'violao'] as Instrumento[]).flatMap((inst) =>
        Object.entries(overridesByInst[inst]).map(([key, value]) => ({ key, chords: value, instrumento: inst }))
      ),
    };

    const result = await saveSong(payload);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      if (result.code === 'duplicate_title') setDuplicateOpen(true);
      return;
    }

    pendingHref.current = initial.id ? null : `/admin/musica/${result.id}`;
    setSavedOpen(true);
  }

  /** Mesmo resultado do botão "+ Nova música" da Home: formulário limpo, pronto para cadastrar. */
  function startNewSong() {
    if (initial.id) {
      router.push('/admin/nova');
      return;
    }
    setTitle(EMPTY.title);
    setArtist(EMPTY.artist);
    setSlug(EMPTY.slug);
    setSlugTouched(false);
    setBaseKey('');
    setKeyTouched(false);
    setLyrics(EMPTY.lyrics);
    setChords(EMPTY.chords);
    setChordsGuitar(EMPTY.chords_guitar);
    setCapo(EMPTY.capo);
    setBpm('');
    setTimeSignature('');
    setSourceUrl('');
    setYoutubeUrl('');
    setNotes('');
    setPublished(EMPTY.published);
    setChordsReviewed(EMPTY.chords_reviewed);
    setOverridesByInst({ teclado: {}, violao: {} });
    setTab('letra');
    setError(null);
    setDuplicateOpen(false);
    window.scrollTo({ top: 0 });
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

  useEffect(() => {
    if (duplicateOpen) duplicateOkRef.current?.focus();
  }, [duplicateOpen]);

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
    <main className="shell song-editor">
      <div className="song-editor__head">
        <h1 className="song-editor__title">{initial.id ? 'Editar música' : 'Nova música'}</h1>
        <span className="header-spacer" />
        <button className="btn btn--tint btn--sm" onClick={startNewSong} disabled={busy} type="button">
          <PlusIcon size={13} />
          Nova música
        </button>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div className="card song-editor__panel">
        <label className="field">
          <span className="field__label">MÚSICA</span>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span className="field__label">ARTISTA</span>
          <input
            className="input"
            value={artist}
            onChange={(e) => setArtist(e.target.value)}
          />
        </label>

        <label className="field">
          <span className="field__label">ENDEREÇO NO SITE</span>
          <input
            className="input input--mono"
            value={slugTouched ? slug : effectiveSlug}
            onChange={(e) => {
              setSlugTouched(true);
              setSlug(e.target.value);
            }}
          />
        </label>

        <label className="field">
          <span className="field__label">YOUTUBE</span>
          <input
            className="input input--mono"
            inputMode="url"
            autoComplete="url"
            value={youtubeUrl}
            onChange={(e) => setYoutubeUrl(e.target.value)}
          />
        </label>

        <label className="chk-row" data-on={published}>
          <input
            type="checkbox"
            className="visually-hidden"
            checked={published}
            onChange={(e) => setPublished(e.target.checked)}
          />
          <span className="chk-row__box" aria-hidden="true">
            {published ? <CheckIcon size={10} /> : null}
          </span>
          <span className="chk-row__label">Publicada (visível para todos e para o Lyra)</span>
        </label>
      </div>

      <div className="song-editor__toggle">
        <nav className="seg" aria-label="Letra ou cifra">
          <button className="seg__item" data-active={tab === 'letra'} onClick={() => setTab('letra')} type="button">
            Letra
          </button>
          <button className="seg__item" data-active={tab === 'cifra'} onClick={() => setTab('cifra')} type="button">
            Cifra
          </button>
        </nav>
      </div>

      {tab === 'letra' ? (
        <div style={{ paddingTop: 12 }}>
          <label className="field">
            <textarea
              className="textarea"
              value={lyrics}
              onChange={(e) => setLyrics(e.target.value)}
              rows={18}
              aria-label="Letra"
            />
          </label>
        </div>
      ) : (
        <div style={{ paddingTop: 12 }}>
          <div className="cifra-editor">
            <div className="cifra-editor__toolbar">
              <div className="cifra-editor__meta">
              <label className="cifra-editor__key">
                <span className="cifra-editor__key-label">Tom</span>
                <select
                  className="select cifra-editor__key-select"
                  value={baseKeyNorm}
                  aria-label="Tom original da cifra"
                  onChange={(e) => {
                    setKeyTouched(true);
                    setBaseKey(e.target.value);
                  }}
                >
                  <option value="" disabled>
                    A detectar
                  </option>
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
              value={chords}
              onChange={(e) => setChords(e.target.value)}
              rows={16}
              spellCheck={false}
              aria-label="Cifra de teclado"
            />

            <div className="cifra-editor__status">
              <KeyDetectionHint
                detection={detectedKey}
                currentKey={baseKeyNorm}
                onApply={(key) => {
                  setKeyTouched(true);
                  setBaseKey(key);
                }}
              />
            </div>
          </div>

          <div className="field">
            <span className="field__label">REVISÃO</span>
            <nav className="seg" aria-label="Status de revisão da cifra">
              <button
                type="button"
                className="seg__item"
                data-active={!chordsReviewed}
                aria-pressed={!chordsReviewed}
                onClick={() => setChordsReviewed(false)}
              >
                Revisar
              </button>
              <button
                type="button"
                className="seg__item"
                data-active={chordsReviewed}
                aria-pressed={chordsReviewed}
                onClick={() => setChordsReviewed(true)}
              >
                <CheckIcon size={12} />
                Revisada
              </button>
            </nav>
          </div>
        </div>
      )}

      <div className="sticky-actions">
        <button className="btn btn--tint" onClick={onSave} disabled={busy || !title.trim()} type="button">
          {busy ? 'Salvando...' : 'Salvar'}
        </button>
        {initial.id && (
          <>
            <Link
              className="btn btn--ghost-mono"
              href={
                chords.trim()
                  ? cifraPath(effectiveSlug, normalizeKey(baseKey || initial.base_key, EMPTY.base_key), 'teclado')
                  : `/musica/${effectiveSlug}`
              }
              target="_blank"
            >
              <ExternalLinkIcon size={12} />
              Ver no site
            </Link>
            <button className="btn btn--danger-tint sticky-actions__end" onClick={onDelete} disabled={busy} type="button">
              Excluir
            </button>
          </>
        )}
      </div>
      {duplicateOpen && (
        <div className="dialog-backdrop">
          <div
            className="dialog dialog--error"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="duplicate-title"
            aria-describedby="duplicate-desc"
          >
            <span className="dialog__icon" aria-hidden="true">
              <AlertTriangleIcon size={22} />
            </span>
            <strong id="duplicate-title">Cadastro bloqueado</strong>
            <p id="duplicate-desc">
              Já existe uma música cadastrada com esse título e esse artista. A música <b>não foi
              salva</b>. Altere o título/artista ou edite a música existente.
            </p>
            <button
              ref={duplicateOkRef}
              className="btn btn--tint"
              type="button"
              onClick={() => setDuplicateOpen(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
      {savedOpen && (
        <div className="dialog-backdrop">
          <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="saved-title" aria-describedby="saved-desc">
            <strong id="saved-title">Música salva</strong>
            <p id="saved-desc">A música foi salva com sucesso.</p>
            <button ref={okRef} className="btn btn--tint" type="button" onClick={dismissSaved}>
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
  const current = currentKey ? normalizeKey(currentKey) : '';
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
