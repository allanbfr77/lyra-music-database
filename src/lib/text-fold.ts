/**
 * Accent-insensitive search helpers.
 * "joão", "joao" and "JOÃO" must match the same songs.
 */

const ACCENT_CLASS: Record<string, string> = {
  a: 'aAáàâãäåÁÀÂÃÄÅ',
  e: 'eEéèêëÉÈÊË',
  i: 'iIíìîïÍÌÎÏ',
  o: 'oOóòôõöÓÒÔÕÖ',
  u: 'uUúùûüÚÙÛÜ',
  c: 'cCçÇ',
  n: 'nNñÑ',
  y: 'yYýÿÝŸ',
};

/** Strips combining marks: "João" → "Joao", "ação" → "acao", "há" → "ha". */
export function foldAccents(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '');
}

function escapeRegexLiteral(char: string): string {
  // Character classes keep the PostgREST filter free of backslashes.
  // Inside quotes, "." and "(" stay part of the value instead of the syntax.
  // A leading caret would negate the class, so it is escaped on its own.
  if (char === ']') return '[]]';
  if (char === '^') return '\\^';
  if (char === '\\') return '';
  if ('.*+?${}()|[-'.includes(char)) return `[${char}]`;
  return char;
}

/**
 * PostgreSQL `~*` pattern that matches the term with or without accents.
 * "vovô" and "vovo" produce the same pattern.
 */
export function accentInsensitivePattern(value: string): string {
  let pattern = '';
  for (const char of value) {
    const base = foldAccents(char).toLowerCase();
    if (!base) continue;
    const group = ACCENT_CLASS[base];
    if (group) {
      pattern += `[${group}]`;
      continue;
    }
    if (/^[a-z0-9]$/.test(base)) {
      pattern += base;
      continue;
    }
    pattern += escapeRegexLiteral(char);
  }
  return pattern;
}

/** PostgREST `or` filter: column.imatch."pattern" for each column. */
export function accentInsensitiveOr(columns: string[], value: string): string | null {
  const pattern = accentInsensitivePattern(value);
  if (!pattern || columns.length === 0) return null;
  const quoted = `"${pattern.replace(/"/g, '""')}"`;
  return columns.map((column) => `${column}.imatch.${quoted}`).join(',');
}
