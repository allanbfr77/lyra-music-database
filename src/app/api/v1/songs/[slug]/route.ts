import type { NextRequest } from 'next/server';
import { apiError, json, mapSong, preflight } from '@/lib/api';
import { listPublishedSongVersions, mapVersionDetail, mapVersionSummary } from '@/lib/lyra-versions';
import { getSongBySlug } from '@/lib/songs';
import { parseInstrumento } from '@/lib/types';

export const dynamic = 'force-dynamic';

function includeList(value: string | null) {
  return (value ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * Música completa. Com ?include=all_keys vem a cifra já transposta em todos os
 * tons publicados — uma requisição só para importar tudo na biblioteca local.
 * ?instrumento=violao devolve a cifra de violão (padrão: teclado).
 * slide_versions sempre vem como resumo; ?include=slide_versions traz slides e letra.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const includes = includeList(request.nextUrl.searchParams.get('include'));
  const includeAllKeys = includes.some((value) => ['all_keys', 'chords', 'all'].includes(value));
  const includeVersionDetails = includes.some((value) => ['slide_versions', 'all'].includes(value));
  const instrumento = parseInstrumento(request.nextUrl.searchParams.get('instrumento'));

  try {
    const song = await getSongBySlug(slug);
    if (!song) return apiError('Música não encontrada.', 404);

    const versions = await listPublishedSongVersions(song);
    return json({
      ...mapSong(song, { includeAllKeys, instrumento }),
      slide_versions: versions.map((version) =>
        includeVersionDetails ? mapVersionDetail(version) : mapVersionSummary(version)
      ),
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao buscar a música.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
