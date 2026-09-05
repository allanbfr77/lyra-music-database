import { API_VERSION, json, preflight } from '@/lib/api';
import { siteUrl } from '@/lib/env';
import { countSongs } from '@/lib/songs';

export const dynamic = 'force-dynamic';

/** Documento de descoberta: o Lyra aponta para cá e aprende o resto sozinho. */
export async function GET() {
  const base = `${siteUrl()}/api/${API_VERSION}`;
  let songs: number | null = null;
  try {
    songs = await countSongs();
  } catch {
    songs = null;
  }

  return json({
    name: 'Banco de Músicas do Lyra',
    provider: 'lyra-songbank',
    api_version: API_VERSION,
    format: 'lyra.song.v1',
    auth: 'none',
    site_url: siteUrl(),
    song_count: songs,
    endpoints: {
      search: `${base}/songs?q={termo}&fields={title,artist,lyrics}&limit={1-100}&offset={n}`,
      song: `${base}/songs/{slug}`,
      song_with_all_keys: `${base}/songs/{slug}?include=all_keys`,
      song_slide_versions: `${base}/songs/{slug}/slide-versions`,
      song_slide_versions_with_slides: `${base}/songs/{slug}/slide-versions?include=slides`,
      slide_version: `${base}/slide-versions/{id}`,
      custom_slide_versions: `${base}/slide-versions`,
      chords_in_key: `${base}/songs/{slug}/chords/{key_slug}`,
      guitar_chords: `${base}/songs/{slug}/chords/{key_slug}?instrumento=violao`,
      sync: `${base}/sync?since={iso8601}&limit={1-500}`,
    },
    slide_versions: {
      description:
        'Só entram edições marcadas como enviadas ao programa. Salvar slides no site não publica para o Lyra.',
      kinds: ['original', 'user', 'custom'],
    },
    key_slugs: {
      description: 'Tom em minúsculo; # vira "s", bemol vira "b", menor recebe "m" no fim.',
      examples: { A: 'a', 'C#': 'cs', Bb: 'bb', 'F#m': 'fsm' },
    },
    search_fields: {
      available: ['title', 'artist', 'lyrics'],
      default: ['title', 'artist', 'lyrics'],
      description: 'Use o parâmetro "fields" para restringir onde buscar, separado por vírgula.',
    },
  });
}

export async function OPTIONS() {
  return preflight();
}
