import type { NextRequest } from 'next/server';
import { apiError, clampInt, json, preflight } from '@/lib/api';
import { buildApiPlaylists, buildSongIndex } from '@/lib/playlist';
import { loadAllManualItems, loadPublishedSongRefs } from '@/lib/playlist-api';
import { loadRemoteCultos } from '@/lib/tom-louvores';

export const dynamic = 'force-dynamic';

/**
 * Playlists dos cultos, somente leitura. A autenticação (Bearer) é feita no
 * middleware para todo /api, igual às rotas de músicas.
 * Paginação como em /sync: ordena por updated_at e devolve next_since.
 * Ex.: /api/v1/playlists?since=2026-11-01T00:00:00Z&limit=50
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const since = params.get('since');
  const limit = clampInt(params.get('limit'), 100, 1, 100);

  if (since && Number.isNaN(Date.parse(since))) {
    return apiError('Parâmetro "since" deve ser uma data ISO 8601, ex.: 2026-01-01T00:00:00Z', 400);
  }

  try {
    const [remote, songs] = await Promise.all([loadRemoteCultos(), loadPublishedSongRefs()]);
    if (!remote.ok) return apiError('Não foi possível ler as playlists dos cultos agora.', 502);

    const manual = await loadAllManualItems(songs);
    const all = buildApiPlaylists(remote.cultos, manual, buildSongIndex(songs));

    const sinceTime = since ? Date.parse(since) : null;
    const fresh = sinceTime === null ? all : all.filter((item) => Date.parse(item.updated_at) > sinceTime);
    const playlists = fresh.slice(0, limit);

    return json(
      {
        playlists,
        has_more: fresh.length > limit,
        next_since: playlists.length ? playlists[playlists.length - 1].updated_at : since,
      },
      { cache: 'no-store' }
    );
  } catch {
    return apiError('Erro ao montar as playlists.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
