/**
 * Motor de cifras: análise de texto, transposição e nomes de tons.
 *
 * Formato esperado da cifra (igual ao Cifra Club):
 *
 *   [Intro] G  D  Em  C
 *
 *   G            D/F#      Em
 *   Tu és o Deus de toda a terra
 *
 * Linhas em que TODOS os elementos são acordes viram linhas de acorde e são
 * transpostas. Linhas de letra nunca são tocadas.
 */

export const SHARP_NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
export const FLAT_NOTES = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

/** Grafia convencional de cada tom maior, por classe de altura (0 = C). */
const MAJOR_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
/** Grafia convencional de cada tom menor, por classe de altura (0 = C). */
const MINOR_KEYS = ['Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m', 'Am', 'Bbm', 'Bm'];

const PITCH_CLASS: Record<string, number> = {
  'C': 0, 'B#': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4, 'Fb': 4, 'E#': 5, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7,
  'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11, 'Cb': 11,
};

/** Tons cuja armadura usa bemóis. */
const FLAT_KEYS = new Set([
  'F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Cb',
  'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm', 'Abm',
]);

const ROOT = '[A-G](?:#|b)?';
const CHORD_RE = new RegExp(
  `^(${ROOT})((?:maj|Maj|MAJ|min|M|m|dim|aug|sus|add|alt|no|°|º|ø|Δ|\\+|-|\\(|\\)|\\d|#|b|,)*)(?:\\/(${ROOT}))?$`
);

/** Tokens que aparecem numa linha de acordes sem serem acordes. */
const NEUTRAL_RE = /^(?:[|:%¦/\\.,\-–—()\[\]]+|\(?\d+x\)?|x\d+|\d+x|N\.?C\.?|%)$/i;
/** Rótulos no meio da linha: "[Intro]", "(2ª vez)", "Refrão:". */
const LABEL_TOKEN_RE = /^(?:\[[^\]]{0,40}\]|\([^)]{0,40}\)|[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9º°ª'.-]{0,24}:)$/;
/** Marcadores de seção: [Intro], (Refrão), Verso 1: */
const SECTION_RE = /^\s*(?:\[[^\]]{1,40}\]|\([A-Za-zÀ-ÿ][^)]{0,38}\)|[A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9 º°ª'.-]{0,30}:)\s*$/;

export type ChordToken = { col: number; text: string; isChord: boolean };
export type ChartLine =
  | { type: 'blank' }
  | { type: 'section'; text: string }
  | { type: 'chords'; text: string; tokens: ChordToken[] }
  | { type: 'lyric'; text: string };

// ---------------------------------------------------------------------------
// Tons
// ---------------------------------------------------------------------------

export type ParsedKey = { pc: number; minor: boolean; name: string };

export function parseKey(key: string | null | undefined): ParsedKey | null {
  if (!key) return null;
  const raw = key.trim();
  const m = raw.match(/^([A-Ga-g])(#|b)?\s*(m|min|menor)?$/i);
  if (!m) return null;
  const letter = m[1].toUpperCase() + (m[2] ?? '');
  const pc = PITCH_CLASS[letter];
  if (pc === undefined) return null;
  const minor = Boolean(m[3]);
  return { pc, minor, name: canonicalKeyName(pc, minor) };
}

/**
 * Cada altura tem UMA grafia oficial (Db e não C#; F# e não Gb).
 * Sem isso, o mesmo tom teria dois links diferentes — e os favoritos do
 * usuário precisam ser únicos e permanentes.
 */
function canonicalKeyName(pc: number, minor: boolean): string {
  return (minor ? MINOR_KEYS : MAJOR_KEYS)[pc];
}

/** "C#" → "cs" | "Bb" → "bb" | "F#m" → "fsm" — seguro para URL e permanente. */
export function keyToSlug(key: string): string {
  const p = parseKey(key);
  if (!p) return 'c';
  const name = p.name;
  const letter = name[0].toLowerCase();
  const accidental = name.includes('#') ? 's' : name.includes('b') ? 'b' : '';
  return `${letter}${accidental}${p.minor ? 'm' : ''}`;
}

/** "fsm" → "F#m". Retorna null se o slug não for um tom válido. */
export function slugToKey(slug: string): string | null {
  const m = slug.trim().toLowerCase().match(/^([a-g])(s|b)?(m)?$/);
  if (!m) return null;
  const letter = m[1].toUpperCase() + (m[2] === 's' ? '#' : m[2] === 'b' ? 'b' : '');
  const pc = PITCH_CLASS[letter];
  if (pc === undefined) return null;
  return canonicalKeyName(pc, Boolean(m[3]));
}

/** Os 12 tons possíveis, na mesma modalidade (maior/menor) do tom base. */
export function allKeysFor(baseKey: string): string[] {
  const base = parseKey(baseKey) ?? { pc: 0, minor: false, name: 'C' };
  const table = base.minor ? MINOR_KEYS : MAJOR_KEYS;
  const order: string[] = [];
  for (let i = 0; i < 12; i++) order.push(table[(base.pc + i) % 12]);
  return order;
}

export function normalizeKey(key: string | null | undefined, fallback = 'C'): string {
  return parseKey(key)?.name ?? fallback;
}

export function semitonesBetween(fromKey: string, toKey: string): number {
  const a = parseKey(fromKey);
  const b = parseKey(toKey);
  if (!a || !b) return 0;
  return ((b.pc - a.pc) % 12 + 12) % 12;
}

function prefersFlats(key: string): boolean {
  const p = parseKey(key);
  return p ? FLAT_KEYS.has(p.name) : false;
}

// ---------------------------------------------------------------------------
// Acordes
// ---------------------------------------------------------------------------

function transposeNote(note: string, semitones: number, useFlats: boolean): string {
  const pc = PITCH_CLASS[note];
  if (pc === undefined) return note;
  const next = ((pc + semitones) % 12 + 12) % 12;
  return (useFlats ? FLAT_NOTES : SHARP_NOTES)[next];
}

/** Transpõe um acorde isolado. Retorna null se o token não for um acorde. */
export function transposeChord(token: string, semitones: number, useFlats: boolean): string | null {
  const m = token.match(CHORD_RE);
  if (!m) return null;
  const [, root, quality = '', bass] = m;
  const newRoot = transposeNote(root, semitones, useFlats);
  const newBass = bass ? transposeNote(bass, semitones, useFlats) : null;
  return newRoot + quality + (newBass ? `/${newBass}` : '');
}

export function isChordToken(token: string): boolean {
  return CHORD_RE.test(token);
}

function classify(line: string): ChartLine {
  if (!line.trim()) return { type: 'blank' };
  if (SECTION_RE.test(line) && !isChordToken(line.trim())) {
    return { type: 'section', text: line.trim() };
  }

  const tokens: ChordToken[] = [];
  let chordCount = 0;
  let ok = true;
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const text = m[0];
    const isChord = isChordToken(text);
    if (isChord) chordCount++;
    else if (!NEUTRAL_RE.test(text) && !LABEL_TOKEN_RE.test(text)) { ok = false; break; }
    tokens.push({ col: m.index, text, isChord });
  }

  if (ok && chordCount > 0) return { type: 'chords', text: line, tokens };
  return { type: 'lyric', text: line };
}

/** Divide a cifra em linhas classificadas, prontas para renderizar. */
export function parseChart(chart: string): ChartLine[] {
  return chart.replace(/\r\n?/g, '\n').split('\n').map(classify);
}

/**
 * Transpõe uma linha de acordes preservando, na medida do possível, a coluna
 * original de cada acorde (para continuar alinhado com a sílaba da letra).
 */
export function transposeChordLine(line: string, semitones: number, useFlats: boolean): string {
  let out = '';
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line))) {
    const replaced = transposeChord(m[0], semitones, useFlats) ?? m[0];
    const minCol = out.length === 0 ? 0 : out.length + 1;
    const col = Math.max(m.index, minCol);
    out += ' '.repeat(col - out.length) + replaced;
  }
  return out;
}

/** Transpõe uma cifra inteira do tom `fromKey` para o tom `toKey`. */
export function transposeChart(chart: string, fromKey: string, toKey: string): string {
  const semitones = semitonesBetween(fromKey, toKey);
  const useFlats = prefersFlats(toKey);
  const lines = chart.replace(/\r\n?/g, '\n').split('\n');
  return lines
    .map((line) => (classify(line).type === 'chords' ? transposeChordLine(line, semitones, useFlats) : line))
    .join('\n');
}

/** Lista única de acordes usados, na ordem em que aparecem. */
export function uniqueChords(chart: string): string[] {
  const seen = new Set<string>();
  for (const line of parseChart(chart)) {
    if (line.type !== 'chords') continue;
    for (const t of line.tokens) if (t.isChord && !seen.has(t.text)) seen.add(t.text);
  }
  return [...seen];
}

/** Remove as linhas de acorde, deixando só a letra. */
export function chartToLyrics(chart: string): string {
  return parseChart(chart)
    .filter((l) => l.type !== 'chords')
    .map((l) => (l.type === 'blank' ? '' : (l as { text: string }).text))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
