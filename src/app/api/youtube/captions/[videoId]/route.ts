import { NextResponse } from 'next/server';
import { fetchYoutubeCaptionCues } from '@/lib/youtube-captions';

type Params = { params: Promise<{ videoId: string }> };

export async function GET(_request: Request, { params }: Params) {
  const { videoId } = await params;
  if (!/^[\w-]{11}$/.test(videoId)) {
    return NextResponse.json({ cues: [] }, { status: 400 });
  }

  try {
    const cues = await fetchYoutubeCaptionCues(videoId);
    return NextResponse.json(
      { cues },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch {
    return NextResponse.json({ cues: [] }, { status: 502 });
  }
}
