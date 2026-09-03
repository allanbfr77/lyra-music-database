import type { NextRequest } from 'next/server';
import { apiError, clampInt, json, mapSearchHit, preflight } from '@/lib/api';
import { searchSongs } from '@/lib/songs';

export const dynamic = 'force-dynamic';

/**
 * Busca usada pelo Lyra: procura em título, artista e trecho da letra
 * de uma vez só. Ex.: /api/v1/songs?q=deus%20de%20toda%20a%20terra
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const q = (params.get('q') ?? params.get('query') ?? '').trim();
  const limit = clampInt(params.get('limit'), 20, 1, 100);
  const offset = clampInt(params.get('offset'), 0, 0, 100000);

  try {
    const hits = await searchSongs(q, limit, offset);
    return json({
      query: q,
      limit,
      offset,
      count: hits.length,
      has_more: hits.length === limit,
      results: hits.map(mapSearchHit),
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro na busca.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
