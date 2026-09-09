/** Normaliza texto para comparar fala com a letra cadastrada. */
export function normalizeLyric(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Divide a letra em linhas preservando vazias (índices estáveis na UI). */
export function splitLyricLines(text: string): string[] {
  return text.replace(/\r\n/g, '\n').split('\n');
}

function wordSet(normalized: string): Set<string> {
  return new Set(normalized.split(' ').filter((word) => word.length > 1));
}

/** Pontuação 0–1 entre uma linha da letra e o trecho reconhecido. */
export function scoreLyricMatch(line: string, transcript: string): number {
  const a = normalizeLyric(line);
  const b = normalizeLyric(transcript);
  if (!a || !b || a.length < 2 || b.length < 2) return 0;

  if (b.includes(a) || a.includes(b)) {
    return 0.92 + Math.min(a.length, b.length) / 2000;
  }

  const lineWords = a.split(' ').filter((word) => word.length > 1);
  if (lineWords.length === 0) return 0;

  const heard = wordSet(b);
  let hits = 0;
  for (const word of lineWords) {
    if (heard.has(word)) hits += 1;
  }
  const ratio = hits / lineWords.length;

  // Trechos curtos exigem acerto quase total; longos toleram ruído.
  if (lineWords.length <= 2) return ratio >= 1 ? ratio : 0;
  if (lineWords.length <= 4) return ratio >= 0.6 ? ratio : 0;
  return ratio >= 0.45 ? ratio : 0;
}

/**
 * Escolhe a linha da letra que melhor corresponde ao áudio.
 * Prefere avançar a partir da linha atual, mas aceita repetição (refrão)
 * quando o trecho casa forte em outra posição.
 */
export function findMatchingLineIndex(
  lines: string[],
  transcript: string,
  currentIndex: number | null
): number | null {
  const needle = normalizeLyric(transcript);
  if (needle.length < 3) return null;

  const start = currentIndex == null ? 0 : Math.max(0, currentIndex);
  let bestIndex: number | null = null;
  let bestScore = 0;

  // Janela à frente (inclui a linha atual) — fluxo normal da música.
  const forwardEnd = Math.min(lines.length, start + 10);
  for (let i = start; i < forwardEnd; i++) {
    const score = scoreLyricMatch(lines[i] ?? '', needle);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex != null && bestScore >= 0.5) return bestIndex;

  // Busca global para refrões / trechos que se repetem.
  bestIndex = null;
  bestScore = 0;
  for (let i = 0; i < lines.length; i++) {
    if (!normalizeLyric(lines[i] ?? '')) continue;
    const score = scoreLyricMatch(lines[i] ?? '', needle);
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }

  if (bestIndex != null && bestScore >= 0.65) return bestIndex;
  return null;
}

export type YoutubeCaptionCue = {
  start: number;
  duration: number;
  text: string;
};

/** Cue ativa no instante do player (áudio do vídeo). */
export function findCueAtTime(cues: YoutubeCaptionCue[], timeSec: number): YoutubeCaptionCue | null {
  if (!cues.length) return null;

  for (const cue of cues) {
    if (timeSec >= cue.start && timeSec < cue.start + cue.duration) return cue;
  }

  let previous: YoutubeCaptionCue | null = null;
  for (const cue of cues) {
    if (cue.start <= timeSec) previous = cue;
    else break;
  }
  return previous;
}
