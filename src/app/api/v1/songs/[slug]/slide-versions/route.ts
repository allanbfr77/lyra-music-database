import type { NextRequest } from 'next/server';
import { apiError, json, preflight } from '@/lib/api';
import { listPublishedSongVersions, mapVersionDetail, mapVersionSummary } from '@/lib/lyra-versions';
import { getSongBySlug } from '@/lib/songs';

export const dynamic = 'force-dynamic';

/**
 * Versões de slides que o Lyra pode importar nesta música:
 * Original + edições já enviadas. Rascunhos salvos e não enviados não entram.
 */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const details = request.nextUrl.searchParams.get('include') === 'slides';

  try {
    const song = await getSongBySlug(slug);
    if (!song) return apiError('Música não encontrada.', 404);

    const versions = await listPublishedSongVersions(song);
    return json({
      format: 'lyra.slide_versions.v1',
      song_id: song.id,
      song_slug: song.slug,
      song_title: song.title,
      count: versions.length,
      versions: versions.map((version) => (details ? mapVersionDetail(version) : mapVersionSummary(version))),
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao listar versões dos slides.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
