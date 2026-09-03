import type { NextRequest } from 'next/server';
import { apiError, json, mapSong, preflight } from '@/lib/api';
import { getSongBySlug } from '@/lib/songs';

export const dynamic = 'force-dynamic';

/**
 * Música completa. Com ?include=all_keys vem a cifra já transposta em todos os
 * tons publicados — uma requisição só para importar tudo na biblioteca local.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const includeAllKeys = ['all_keys', 'chords', 'all'].includes(request.nextUrl.searchParams.get('include') ?? '');

  try {
    const song = await getSongBySlug(slug);
    if (!song) return apiError('Música não encontrada.', 404);
    return json(mapSong(song, { includeAllKeys }));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao buscar a música.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
