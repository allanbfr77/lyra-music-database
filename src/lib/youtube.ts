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

/** Extrai o ID do vídeo a partir do mesmo valor usado em parseYoutubeUrl. */
export function youtubeVideoId(raw: string | null | undefined): string | null {
  const parsed = parseYoutubeUrl(raw);
  if (!parsed) return null;

  try {
    const url = new URL(parsed);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') {
      const id = url.pathname.split('/').filter(Boolean)[0] ?? '';
      return /^[\w-]{11}$/.test(id) ? id : null;
    }

    const fromQuery = url.searchParams.get('v');
    if (fromQuery && /^[\w-]{11}$/.test(fromQuery)) return fromQuery;

    const parts = url.pathname.split('/').filter(Boolean);
    const marker = parts.findIndex((part) => part === 'embed' || part === 'shorts' || part === 'live' || part === 'v');
    if (marker >= 0) {
      const id = parts[marker + 1] ?? '';
      return /^[\w-]{11}$/.test(id) ? id : null;
    }
  } catch {
    /* endereço inválido */
  }

  return null;
}

/** URL do player incorporado, com autoplay, ou null. */
export function youtubeEmbedUrl(raw: string | null | undefined): string | null {
  const id = youtubeVideoId(raw);
  return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : null;
}
