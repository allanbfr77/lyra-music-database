import type { NextRequest } from 'next/server';
import { apiError, chordUrl, json, preflight } from '@/lib/api';
import { availableInstruments, chartForKey, keyToSlug, normalizeKey, slugToKey, uniqueChords } from '@/lib/chords';
import { getSongBySlug, publishedKeys } from '@/lib/songs';
import { parseInstrumento } from '@/lib/types';

export const dynamic = 'force-dynamic';

/** Cifra de uma música num tom específico: /api/v1/songs/galileu/chords/a */
export async function GET(request: NextRequest, context: { params: Promise<{ slug: string; key: string }> }) {
  const { slug, key: keyParam } = await context.params;
  const instrumento = parseInstrumento(request.nextUrl.searchParams.get('instrumento'));

  const key = slugToKey(keyParam) ?? normalizeKey(decodeURIComponent(keyParam), '');
  if (!key) return apiError(`Tom inválido: "${keyParam}". Use por exemplo a, bb, cs, fsm.`, 400);

  try {
    const song = await getSongBySlug(slug);
    if (!song) return apiError('Música não encontrada.', 404);

    const instrumentos = availableInstruments(song, song.overrides);
    if (!instrumentos.includes(instrumento)) {
      return apiError(
        instrumento === 'violao'
          ? 'Esta música não tem cifra de violão cadastrada.'
          : 'Esta música não tem cifra cadastrada.',
        404
      );
    }

    const keys = publishedKeys(song);
    if (!keys.includes(key)) {
      return json(
        {
          error: {
            status: 404,
            message: `O tom de ${key} não está publicado para esta música.`,
            available_keys: keys,
            instrumentos,
          },
        },
        { status: 404, cache: 'no-store' }
      );
    }

    const { chart, source } = chartForKey(song, song.overrides, key, instrumento);

    return json({
      format: 'lyra.chords.v1',
      song_id: song.id,
      slug: song.slug,
      title: song.title,
      artist: song.artist,
      instrumento,
      instrumentos,
      base_key: normalizeKey(song.base_key),
      key,
      key_slug: keyToSlug(key),
      source,
      capo: song.capo,
      chords: chart,
      chords_used: uniqueChords(chart),
      available_keys: keys,
      url: chordUrl(song.slug, key, instrumento),
      updated_at: song.updated_at,
    });
  } catch (error) {
    return apiError(error instanceof Error ? error.message : 'Erro ao gerar a cifra.', 500);
  }
}

export async function OPTIONS() {
  return preflight();
}
