export type LyricSpan = { text: string; start: number; end: number };

/** Quebra a letra nos intervalos em branco entre trechos. Uma linha vazia (ou mais) separa. */
const GAP = /\n(?:[ \t]*\n)+/g;

export function splitLyricSpans(text: string): LyricSpan[] {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized) return [{ text: '', start: 0, end: 0 }];

  const parts: LyricSpan[] = [];
  const re = new RegExp(GAP.source, 'g');
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(normalized))) {
    parts.push({ text: normalized.slice(last, match.index), start: last, end: match.index });
    last = match.index + match[0].length;
  }
  parts.push({ text: normalized.slice(last), start: last, end: normalized.length });
  return parts;
}

export function splitLyricStanzas(text: string): string[] {
  return splitLyricSpans(text)
    .map((part) => part.text)
    .filter((part) => part.trim().length > 0);
}

/** Em qual trecho o cursor cai, depois de uma edição que criou um intervalo em branco. */
export function caretInLyricSpans(text: string, cursor: number): { index: number; pos: number } {
  const parts = splitLyricSpans(text);
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (cursor <= part.end) return { index: i, pos: Math.max(0, cursor - part.start) };
    const next = parts[i + 1];
    if (next && cursor < next.start) return { index: i + 1, pos: 0 };
  }
  const last = parts[parts.length - 1];
  return { index: parts.length - 1, pos: last.text.length };
}
