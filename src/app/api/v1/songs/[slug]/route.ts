import type { NextRequest } from 'next/server';
import { apiError, json, mapSong, preflight } from '@/lib/api';
import { getSongBySlug } from '@/lib/songs';
import { parseInstrumento } from '@/lib/types';

export const dynamic = 'force-dynamic';

/**
 * Música completa. Com ?include=all_keys vem a cifra já transposta em todos os
 * tons publicados — uma requisição só para importar tudo na biblioteca local.
 * ?instrumento=violao devolve a cifra de violão (padrão: teclado).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const includeAllKeys = ['all_keys', 'chords', 'all'].includes(request.nextUrl.searchParams.get('include') ?? '');
  const instrumento = parseInstrumento(request.nextUrl.searchParams.get('instrumento'));

  try {
    const song = await getSongBySlug(slug);
    if (!song) return apiError('Música não encontrada.', 404);
    return json(mapSong(song, { includeAllKeys, instrumento }));
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao buscar a música.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
