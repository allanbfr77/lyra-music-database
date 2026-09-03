import { NextResponse } from 'next/server';
import { siteUrl } from '@/lib/env';
import { keyToSlug, normalizeKey } from '@/lib/chords';
import { chartForKey, publishedKeys, type SongWithOverrides } from '@/lib/songs';
import type { SearchHit } from '@/lib/types';

export const API_VERSION = 'v1';

export function json(body: unknown, init?: { status?: number; cache?: string }) {
  return NextResponse.json(body as object, {
    status: init?.status ?? 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': init?.cache ?? 'public, max-age=0, s-maxage=60, stale-while-revalidate=600',
    },
  });
}

export function apiError(message: string, status = 400) {
  return json({ error: { status, message } }, { status, cache: 'no-store' });
}

export function preflight() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
    },
  });
}

export function clampInt(value: string | null, fallback: number, min: number, max: number) {
  if (value === null || value.trim() === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}

export function songUrl(slug: string) {
  return `${siteUrl()}/musica/${slug}`;
}

export function chordUrl(slug: string, key: string) {
  return `${siteUrl()}/musica/${slug}/cifra/${keyToSlug(key)}`;
}

/** Resultado de busca no formato consumido pelo Lyra. */
export function mapSearchHit(hit: SearchHit) {
  const baseKey = normalizeKey(hit.base_key);
  const keys = publishedKeys({ base_key: baseKey, available_keys: hit.available_keys ?? [] });
  return {
    id: hit.id,
    slug: hit.slug,
    title: hit.title,
    artist: hit.artist,
    base_key: baseKey,
    keys,
    has_chords: hit.has_chords,
    snippet: hit.snippet ? hit.snippet.replace(/\[\[|\]\]/g, '') : null,
    highlighted_snippet: hit.snippet,
    updated_at: hit.updated_at,
    url: hit.has_chords ? chordUrl(hit.slug, baseKey) : songUrl(hit.slug),
    api_url: `${siteUrl()}/api/${API_VERSION}/songs/${hit.slug}`,
  };
}

/** Música completa, pronta para o Lyra importar para a biblioteca local. */
export function mapSong(song: SongWithOverrides, options: { includeAllKeys: boolean }) {
  const baseKey = normalizeKey(song.base_key);
  const keys = publishedKeys(song);
  const manual = new Set(song.overrides.map((o) => normalizeKey(o.key)));

  return {
    format: 'lyra.song.v1',
    id: song.id,
    slug: song.slug,
    title: song.title,
    artist: song.artist,
    language: song.language,
    base_key: baseKey,
    capo: song.capo,
    tempo_bpm: song.tempo_bpm,
    time_signature: song.time_signature,
    source_url: song.source_url,
    youtube_url: song.youtube_url,
    notes: song.notes,
    lyrics: song.lyrics,
    chords: song.chords || null,
    has_chords: Boolean(song.chords.trim()),
    keys: keys.map((key) => ({
      key,
      key_slug: keyToSlug(key),
      source: manual.has(key) ? ('manual' as const) : ('auto' as const),
      url: chordUrl(song.slug, key),
      api_url: `${siteUrl()}/api/${API_VERSION}/songs/${song.slug}/chords/${keyToSlug(key)}`,
      ...(options.includeAllKeys ? { chords: chartForKey(song, song.overrides, key).chart } : {}),
    })),
    url: songUrl(song.slug),
    created_at: song.created_at,
    updated_at: song.updated_at,
  };
}
