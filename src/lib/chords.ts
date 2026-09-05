/**
 * Motor de cifras: análise de texto, reconhecimento de tom, transposição
 * e nomes de tons.
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
 *
 * `detectKey` / `detectSongKey` leem a cifra (manual ou importada) sem
 * alterá-la e sugerem o tom original (`base_key`) para a transposição.
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

const NOTE_PT: Record<string, string> = {
  C: 'Dó', D: 'Ré', E: 'Mi', F: 'Fá', G: 'Sol', A: 'Lá', B: 'Si',
};

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

/** Nome completo em português: "Am (Lá menor)", "F# (Fá sustenido maior)". */
export function keyDisplayName(key: string): string {
  const p = parseKey(key);
  if (!p) return key;
  const letter = NOTE_PT[p.name[0]] ?? p.name[0];
  const accidental = p.name.includes('#') ? ' sustenido' : p.name.includes('b') ? ' bemol' : '';
  return `${p.name} (${letter}${accidental} ${p.minor ? 'menor' : 'maior'})`;
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

export type ParsedChord = {
  text: string;
  root: string;
  rootPc: number;
  quality: string;
  bass: string | null;
  bassPc: number | null;
};

export type ChordKind = 'major' | 'minor' | 'diminished' | 'augmented' | 'suspended';

/** Família harmônica do acorde (extensões 7/9/11 continuam na tríade de origem). */
export function chordKind(quality: string): ChordKind {
  if (/^(dim|°|º|ø)/.test(quality)) return 'diminished';
  if (/^(\+|aug)/.test(quality)) return 'augmented';
  if (/^sus/.test(quality)) return 'suspended';
  if (/^(maj|Maj|MAJ|Δ|M(?!in))/.test(quality)) return 'major';
  if (/^(min|m(?!aj)|-)/.test(quality)) return 'minor';
  return 'major';
}

/** 7/9/11/13 sem maj/m/dim — dominante (G7, F9, G11). */
export function isDominantQuality(quality: string): boolean {
  if (!quality) return false;
  if (chordKind(quality) !== 'major') return false;
  if (/^(maj|Maj|MAJ|Δ|M(?!in)|add|sus)/.test(quality)) return false;
  return /\d/.test(quality);
}

/** Interpreta um token de acorde. Inversões (`F9/C`) preservam a fundamental. */
export function parseChord(token: string): ParsedChord | null {
  const m = token.match(CHORD_RE);
  if (!m) return null;
  const [, root, quality = '', bass] = m;
  const rootPc = PITCH_CLASS[root];
  if (rootPc === undefined) return null;
  const bassPc = bass !== undefined ? PITCH_CLASS[bass] : undefined;
  return {
    text: token,
    root,
    rootPc,
    quality,
    bass: bass ?? null,
    bassPc: bass !== undefined && bassPc !== undefined ? bassPc : null,
  };
}

/** Transpõe um acorde isolado. Retorna null se o token não for um acorde. */
export function transposeChord(token: string, semitones: number, useFlats: boolean): string | null {
  const parsed = parseChord(token);
  if (!parsed) return null;
  const newRoot = transposeNote(parsed.root, semitones, useFlats);
  const newBass = parsed.bass ? transposeNote(parsed.bass, semitones, useFlats) : null;
  return newRoot + parsed.quality + (newBass ? `/${newBass}` : '');
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

/**
 * Cifra de uma música num tom específico.
 * Usa a versão manual se existir (modo híbrido); senão transpõe a cifra base.
 * `instrumento` escolhe a cifra de teclado ou de violão (padrão: teclado).
 */
export function chartForKey(
  song: { chords: string; chords_guitar?: string; base_key: string },
  overrides: { key: string; chords: string; instrumento?: 'teclado' | 'violao' }[],
  key: string,
  instrumento: 'teclado' | 'violao' = 'teclado'
): { chart: string; source: 'manual' | 'auto' } {
  const target = normalizeKey(key);
  const inst = instrumento === 'violao' ? 'violao' : 'teclado';
  const manual = overrides.find(
    (o) => normalizeKey(o.key) === target && (o.instrumento ?? 'teclado') === inst
  );
  if (manual && manual.chords.trim()) return { chart: manual.chords, source: 'manual' };
  const base = inst === 'violao' ? (song.chords_guitar ?? '') : (song.chords ?? '');
  return { chart: transposeChart(base, normalizeKey(song.base_key), target), source: 'auto' };
}

/** URL pública da cifra. Teclado não leva sufixo — links antigos continuam válidos. */
export function cifraPath(slug: string, key: string, instrumento: 'teclado' | 'violao' = 'teclado'): string {
  const path = `/musica/${slug}/cifra/${keyToSlug(key)}`;
  return instrumento === 'violao' ? `${path}/violao` : path;
}

/** Quais instrumentos têm cifra (base ou ajuste manual) nesta música. */
export function availableInstruments(
  song: { chords?: string | null; chords_guitar?: string | null },
  overrides: { chords: string; instrumento?: 'teclado' | 'violao' }[] = []
): Array<'teclado' | 'violao'> {
  const list: Array<'teclado' | 'violao'> = [];
  if ((song.chords ?? '').trim()) list.push('teclado');
  const hasGuitarBase = Boolean((song.chords_guitar ?? '').trim());
  const hasGuitarOverride = overrides.some(
    (o) => (o.instrumento ?? 'teclado') === 'violao' && o.chords.trim()
  );
  if (hasGuitarBase || hasGuitarOverride) list.push('violao');
  return list;
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

// ---------------------------------------------------------------------------
// Reconhecimento de tom
// ---------------------------------------------------------------------------

export type KeyConfidence = 'high' | 'medium' | 'low';

export type KeyDetection = {
  key: string;
  confidence: KeyConfidence;
  alternatives: string[];
  chordCount: number;
};

const KEY_CANDIDATES = [...allKeysFor('C'), ...allKeysFor('Am')];
const MAJOR_SCALE = new Set([0, 2, 4, 5, 7, 9, 11]);
const MINOR_SCALE = new Set([0, 2, 3, 5, 7, 8, 10, 11]);

function cleanChordToken(text: string): string {
  return text.replace(/^[(\[]+/, '').replace(/[\])]+$/, '').replace(/[,;.:]+$/, '');
}

function parseChordLoose(text: string): ParsedChord | null {
  return parseChord(text) ?? parseChord(cleanChordToken(text));
}

/**
 * Extrai a sequência de acordes na ordem em que aparecem.
 * Prefere linhas de cifra; se não houver, varre o texto (listas coladas).
 */
export function extractChordSequence(chart: string): ParsedChord[] {
  if (!chart.trim()) return [];

  const fromLines: ParsedChord[] = [];
  for (const line of parseChart(chart)) {
    if (line.type !== 'chords') continue;
    for (const token of line.tokens) {
      const parsed = token.isChord ? parseChord(token.text) : parseChordLoose(token.text);
      if (parsed) fromLines.push(parsed);
    }
  }
  if (fromLines.length > 0) return fromLines;

  const fallback: ParsedChord[] = [];
  for (const raw of chart.replace(/\r\n?/g, '\n').split('\n')) {
    const re = /\S+/g;
    let match: RegExpExecArray | null;
    while ((match = re.exec(raw))) {
      const parsed = parseChordLoose(match[0]);
      if (parsed) fallback.push(parsed);
    }
  }
  return fallback;
}

function scaleDegree(rootPc: number, tonicPc: number): number {
  return (rootPc - tonicPc + 12) % 12;
}

function positionWeight(index: number, total: number): number {
  if (total <= 1) return 1.6;
  if (index === 0) return 2;
  if (index === total - 1) return 1.8;
  return 1;
}

function functionScore(deg: number, kind: ChordKind, dominant: boolean, minor: boolean): number {
  if (minor) {
    if (deg === 0) return kind === 'minor' || kind === 'diminished' ? 8 : 1.5;
    if (deg === 2) return kind === 'diminished' ? 2.5 : kind === 'minor' ? 2 : 1;
    if (deg === 3) return kind === 'major' ? 4 : 1.5;
    if (deg === 5) return kind === 'minor' ? 5 : 2;
    if (deg === 7) {
      if (kind === 'major' || dominant) return 7;
      if (kind === 'minor') return 3;
      return 2;
    }
    if (deg === 8) return kind === 'major' ? 5 : 2;
    if (deg === 10) return kind === 'major' || dominant ? 4.5 : 1.5;
    if (deg === 11) return kind === 'diminished' || kind === 'major' || dominant ? 4 : 1;
    return 0.2;
  }

  if (deg === 0) return kind === 'major' || kind === 'suspended' ? 8 : 1.5;
  if (deg === 2) return kind === 'minor' ? 4 : dominant ? 2.5 : 1.2;
  if (deg === 4) return kind === 'minor' ? 2.2 : 1;
  if (deg === 5) return kind === 'major' || kind === 'suspended' ? 5 : 1.5;
  if (deg === 7) return kind === 'major' || dominant || kind === 'suspended' ? 6.5 : 2;
  if (deg === 9) return kind === 'minor' ? 4 : 1.5;
  if (deg === 11) return kind === 'diminished' || dominant ? 2.5 : 1;
  return 0.2;
}

function cadenceBonus(fromDeg: number, toDeg: number, toKind: ChordKind, minor: boolean): number {
  if (minor) {
    if (fromDeg === 7 && toDeg === 0 && toKind === 'minor') return 10;
    if (fromDeg === 10 && toDeg === 0 && toKind === 'minor') return 5;
    if (fromDeg === 5 && toDeg === 0 && toKind === 'minor') return 4;
    if (fromDeg === 8 && toDeg === 0 && toKind === 'minor') return 3;
    return 0;
  }
  if (fromDeg === 7 && toDeg === 0 && toKind !== 'minor') return 10;
  if (fromDeg === 5 && toDeg === 0 && toKind !== 'minor') return 4;
  if (fromDeg === 2 && toDeg === 7) return 3;
  return 0;
}

function isDiatonicDegree(deg: number, minor: boolean): boolean {
  return (minor ? MINOR_SCALE : MAJOR_SCALE).has(deg);
}

function areRelativeKeys(a: string, b: string): boolean {
  const pa = parseKey(a);
  const pb = parseKey(b);
  if (!pa || !pb || pa.minor === pb.minor) return false;
  const [major, minor] = pa.minor ? [pb, pa] : [pa, pb];
  return minor.pc === (major.pc + 9) % 12;
}

function scoreCandidateKey(chords: ParsedChord[], keyName: string): number {
  const parsed = parseKey(keyName);
  if (!parsed) return 0;

  const tonic = parsed.pc;
  const minor = parsed.minor;
  let score = 0;
  const n = chords.length;

  for (let i = 0; i < n; i++) {
    const chord = chords[i];
    const deg = scaleDegree(chord.rootPc, tonic);
    const kind = chordKind(chord.quality);
    const dominant = isDominantQuality(chord.quality);
    const weight = positionWeight(i, n);
    score += functionScore(deg, kind, dominant, minor) * weight;
    if (isDiatonicDegree(deg, minor)) score += 0.8 * weight;
    else score -= 0.4 * weight;

    const tonicQuality = minor ? kind === 'minor' : kind === 'major' || kind === 'suspended';
    if (deg === 0 && tonicQuality) {
      if (i === 0) score += 6;
      if (i === n - 1) score += 8;
    }
  }

  for (let i = 0; i < n - 1; i++) {
    score += cadenceBonus(
      scaleDegree(chords[i].rootPc, tonic),
      scaleDegree(chords[i + 1].rootPc, tonic),
      chordKind(chords[i + 1].quality),
      minor
    );
  }

  return score;
}

function classifyKeyConfidence(
  top: number,
  second: number,
  chordCount: number,
  relatives: boolean
): KeyConfidence {
  if (chordCount < 2) return 'low';
  const gap = top - second;
  const ratio = gap / Math.max(top, 1);
  if (relatives && ratio < 0.22 && gap < 10) {
    return ratio >= 0.1 || gap >= 5 ? 'medium' : 'low';
  }
  if (ratio >= 0.18 || gap >= 8) return 'high';
  if (ratio >= 0.08 || gap >= 4) return 'medium';
  return 'low';
}

function detectFromSequence(chords: ParsedChord[]): KeyDetection | null {
  if (chords.length === 0) return null;

  const ranked = KEY_CANDIDATES
    .map((key) => ({ key, score: scoreCandidateKey(chords, key) }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  if (!winner || winner.score <= 0) return null;

  const second = ranked[1];
  const relatives = Boolean(second && areRelativeKeys(winner.key, second.key));
  const confidence = classifyKeyConfidence(
    winner.score,
    second?.score ?? 0,
    chords.length,
    relatives
  );

  const alternatives: string[] = [];
  if (second && second.score > 0) {
    const gap = winner.score - second.score;
    const ratio = gap / Math.max(winner.score, 1);
    if (ratio < 0.28 || (relatives && ratio < 0.4)) alternatives.push(second.key);
  }

  return { key: winner.key, confidence, alternatives, chordCount: chords.length };
}

/**
 * Detecta o tom mais provável de uma cifra. Não altera o texto original.
 * Em inversões, a análise usa a fundamental (`F9/C` → F).
 */
export function detectKey(chart: string): KeyDetection | null {
  return detectFromSequence(extractChordSequence(chart));
}

/**
 * Detecta o tom da música a partir das cifras de teclado e/ou violão.
 * Usa a sequência com mais acordes — o tom original é o mesmo nos dois.
 */
export function detectSongKey(chords: string, chordsGuitar = ''): KeyDetection | null {
  const keyboard = extractChordSequence(chords);
  const guitar = extractChordSequence(chordsGuitar);
  return detectFromSequence(keyboard.length >= guitar.length ? keyboard : guitar);
}
