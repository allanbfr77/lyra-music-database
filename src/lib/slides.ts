/** Cada grupo de versos separado por linha em branco vira um slide. */

export function slidesPath(slug: string) {
  return `/musica/${slug}/slides`;
}

/** Cópia inicial para o editor. O resultado NÃO deve ser gravado em lyrics. */
export function lyricsToSlides(lyrics: string): string[] {
  return lyrics
    .replace(/\r\n/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((block) => block.trim())
    .filter(Boolean);
}

/** Há uma versão pessoal salva (linha no banco), mesmo que algum bloco esteja vazio. */
export function hasSavedSlides(slides: string[] | null | undefined): boolean {
  return Array.isArray(slides);
}

export function resolveSlideBlocks(saved: string[] | null | undefined, lyricsSeed: string): string[] {
  if (hasSavedSlides(saved)) return saved!.map((slide) => slide.replace(/\r\n/g, '\n'));
  return lyricsToSlides(lyricsSeed);
}
