import type { NextRequest } from 'next/server';
import { apiError, clampInt, json, mapSearchHit, preflight } from '@/lib/api';
import { searchSongs } from '@/lib/songs';
import { SEARCH_FIELDS, apiFieldsToIds, fieldIdsToWeights } from '@/lib/search-fields';

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

  // Onde procurar: fields=title,artist,lyrics (padrão: os três)
  const fieldIds = apiFieldsToIds(params.get('fields'));
  const API_ORDER = ['title', 'artist', 'lyrics'];
  const searchedIn = SEARCH_FIELDS.filter((f) => fieldIds.includes(f.id))
    .map((f) => f.api as string)
    .sort((a, b) => API_ORDER.indexOf(a) - API_ORDER.indexOf(b));

  try {
    const hits = await searchSongs(q, limit, offset, fieldIdsToWeights(fieldIds));
    return json({
      query: q,
      fields: searchedIn,
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
