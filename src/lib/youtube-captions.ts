import type { YoutubeCaptionCue } from '@/lib/lyric-sync';

export type { YoutubeCaptionCue };

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string };
};

const ANDROID_UA = 'com.google.android.youtube/20.10.38 (Linux; U; Android 14) gzip';

const ANDROID_CONTEXT = {
  client: {
    clientName: 'ANDROID',
    clientVersion: '20.10.38',
    hl: 'pt',
    gl: 'BR',
  },
};

function pickCaptionTrack(tracks: CaptionTrack[]): CaptionTrack | null {
  if (!tracks.length) return null;
  const rank = (track: CaptionTrack) => {
    const lang = (track.languageCode ?? '').toLowerCase();
    if (lang === 'pt-br' || lang === 'pt') return track.kind === 'asr' ? 3 : 4;
    if (lang.startsWith('pt')) return track.kind === 'asr' ? 2 : 3;
    if (lang === 'en' || lang.startsWith('en-')) return 1;
    return 0;
  };
  return [...tracks].sort((a, b) => rank(b) - rank(a))[0] ?? null;
}

function captionUrlToJson3(baseUrl: string): string {
  const url = new URL(baseUrl);
  url.searchParams.set('fmt', 'json3');
  return url.toString();
}

function decodeCueText(raw: string): string {
  return raw
    .replace(/\n+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

/** Busca no servidor as legendas/transcrição do vídeo (derivadas do áudio no YouTube). */
export async function fetchYoutubeCaptionCues(videoId: string): Promise<YoutubeCaptionCue[]> {
  if (!/^[\w-]{11}$/.test(videoId)) return [];

  const playerRes = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': ANDROID_UA,
    },
    body: JSON.stringify({
      context: ANDROID_CONTEXT,
      videoId,
    }),
    cache: 'no-store',
  });

  if (!playerRes.ok) return [];

  const playerJson = (await playerRes.json()) as {
    captions?: {
      playerCaptionsTracklistRenderer?: {
        captionTracks?: CaptionTrack[];
      };
    };
  };

  const tracks = playerJson.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
  const track = pickCaptionTrack(tracks);
  if (!track?.baseUrl) return [];

  const timedRes = await fetch(captionUrlToJson3(track.baseUrl), {
    headers: { 'User-Agent': ANDROID_UA },
    cache: 'no-store',
  });
  if (!timedRes.ok) return [];

  const timedJson = (await timedRes.json()) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    }>;
  };

  const cues: YoutubeCaptionCue[] = [];
  for (const event of timedJson.events ?? []) {
    if (event.tStartMs == null) continue;
    const text = decodeCueText((event.segs ?? []).map((seg) => seg.utf8 ?? '').join(''));
    if (!text || text === '\n') continue;
    cues.push({
      start: event.tStartMs / 1000,
      duration: Math.max((event.dDurationMs ?? 1500) / 1000, 0.4),
      text,
    });
  }

  return cues;
}
