/** Aceita o endereço colado pelo admin e devolve um link direto do vídeo, ou null. */
export function parseYoutubeUrl(raw: string | null | undefined): string | null {
  const value = raw?.trim() ?? '';
  if (!value) return null;

  if (/^[\w-]{11}$/.test(value)) {
    return `https://www.youtube.com/watch?v=${value}`;
  }

  try {
    const href = /^https?:\/\//i.test(value) ? value : `https://${value}`;
    const url = new URL(href);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (
      host === 'youtu.be' ||
      host === 'youtube.com' ||
      host === 'm.youtube.com' ||
      host === 'music.youtube.com'
    ) {
      return url.href;
    }
  } catch {
    /* endereço inválido */
  }

  return null;
}
