import type { NextRequest } from 'next/server';
import { apiError, clampInt, json, preflight } from '@/lib/api';
import { buildApiPlaylists, buildSongIndex } from '@/lib/playlist';
import { loadAllManualItems, loadPublishedSongRefs } from '@/lib/playlist-api';
import { loadRemoteCultos } from '@/lib/tom-louvores';

export const dynamic = 'force-dynamic';
// Tom Louvores (até 12 s) + banco de músicas + playlist_items em sequência.
export const maxDuration = 30;

/** Só mensagem/código: nunca o objeto inteiro, para não registrar chaves nem cabeçalhos. */
function describeError(error: unknown): string {
  if (error && typeof error === 'object') {
    const { message, code } = error as { message?: unknown; code?: unknown };
    return [typeof code === 'string' ? code : '', typeof message === 'string' ? message : '']
      .filter(Boolean)
      .join(' ');
  }
  return String(error);
}

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
    if (!remote.ok) {
      console.error('[api/v1/playlists] Tom Louvores indisponível:', remote.error);
      return apiError('Não foi possível ler as playlists dos cultos agora.', 502);
    }

    // Músicas manuais são um complemento: se falharem, a rota segue só com o Tom Louvores.
    let manual: Awaited<ReturnType<typeof loadAllManualItems>> = [];
    let manualFailed = false;
    try {
      manual = await loadAllManualItems(songs);
    } catch (error) {
      manualFailed = true;
      console.error('[api/v1/playlists] playlist_items indisponível:', describeError(error));
    }
    const index = buildSongIndex(songs);
    let all;
    try {
      all = buildApiPlaylists(remote.cultos, manual, index);
    } catch (error) {
      if (manual.length === 0) throw error;
      manualFailed = true;
      console.error('[api/v1/playlists] item manual inválido, ignorando-os:', describeError(error));
      all = buildApiPlaylists(remote.cultos, [], index);
    }

    const sinceTime = since ? Date.parse(since) : null;
    const fresh = sinceTime === null ? all : all.filter((item) => Date.parse(item.updated_at) > sinceTime);
    const playlists = fresh.slice(0, limit);

    const response = json(
      {
        playlists,
        has_more: fresh.length > limit,
        next_since: playlists.length ? playlists[playlists.length - 1].updated_at : since,
      },
      { cache: 'no-store' }
    );
    if (manualFailed) response.headers.set('X-Lyra-Manual-Items', 'unavailable');
    return response;
  } catch (error) {
    console.error('[api/v1/playlists] falha ao montar as playlists:', describeError(error));
    return apiError('Erro ao montar as playlists.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
