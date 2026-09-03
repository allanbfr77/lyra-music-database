/** Gera um slug estável e amigável para URL: "Galileu (Ao Vivo)" → "galileu-ao-vivo". */
export function slugify(input: string): string {
  return (
    input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/['’`]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'musica'
  );
}
