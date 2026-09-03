import type { NextRequest } from 'next/server';
import { apiError, chordUrl, clampInt, json, preflight, songUrl } from '@/lib/api';
import { createPublicClient } from '@/lib/supabase/public';
import { publishedKeys } from '@/lib/songs';
import { normalizeKey } from '@/lib/chords';

export const dynamic = 'force-dynamic';

/**
 * Sincronização incremental: o Lyra guarda o último `updated_at` que recebeu e
 * pede só o que mudou desde então.
 * Ex.: /api/v1/sync?since=2026-01-01T00:00:00Z
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const since = params.get('since');
  const limit = clampInt(params.get('limit'), 200, 1, 500);

  if (since && Number.isNaN(Date.parse(since))) {
    return apiError('Parâmetro "since" deve ser uma data ISO 8601, ex.: 2026-01-01T00:00:00Z', 400);
  }

  try {
    const supabase = createPublicClient();
    let query = supabase
      .from('songs')
      .select('id, slug, title, artist, base_key, available_keys, chords, updated_at')
      .eq('published', true)
      .order('updated_at', { ascending: true })
      .limit(limit);

    if (since) query = query.gt('updated_at', since);

    const { data, error } = await query;
    if (error) return apiError(error.message, 500);

    const rows = data ?? [];
    const songs = rows.map((song) => {
      const baseKey = normalizeKey(song.base_key);
      return {
        id: song.id,
        slug: song.slug,
        title: song.title,
        artist: song.artist,
        base_key: baseKey,
        keys: publishedKeys({ base_key: baseKey, available_keys: song.available_keys ?? [] }),
        has_chords: Boolean((song.chords ?? '').trim()),
        url: (song.chords ?? '').trim() ? chordUrl(song.slug, baseKey) : songUrl(song.slug),
        updated_at: song.updated_at,
      };
    });

    return json(
      {
        since: since ?? null,
        count: songs.length,
        has_more: songs.length === limit,
        next_since: songs.length ? songs[songs.length - 1].updated_at : since,
        songs,
      },
      { cache: 'no-store' }
    );
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro na sincronização.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
