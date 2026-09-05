import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export type UserSlideCopy = {
  /** Blocos dos slides. null = ainda não tem cópia própria. */
  slides: string[] | null;
  /** Letra alternativa só para slides. null = fonte é a letra original. */
  sourceLyrics: string | null;
  publishedSlides: string[] | null;
  publishedAt: string | null;
};

export type CustomSlideEdition = {
  id: string;
  title: string;
  sourceLyrics: string;
  slides: string[];
  publishedSlides: string[] | null;
  publishedAt: string | null;
};

export function emptySlideCopy(): UserSlideCopy {
  return { slides: null, sourceLyrics: null, publishedSlides: null, publishedAt: null };
}

function asSlides(value: unknown): string[] | null {
  return Array.isArray(value) ? value.map((slide) => String(slide).replace(/\r\n/g, '\n')) : null;
}

/**
 * Versão de slides do usuário logado para esta música.
 * slides null = ainda não tem cópia própria (usar o padrão da letra).
 */
export async function loadUserSongSlides(songId: string): Promise<UserSlideCopy> {
  const user = await getAuthUser();
  if (!user || !songId) return emptySlideCopy();

  try {
    const supabase = await createClient();
    const full = await supabase
      .from('user_song_slides')
      .select('slides, source_lyrics, published_slides, published_at')
      .eq('song_id', songId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!full.error) {
      if (!full.data) return emptySlideCopy();
      return {
        slides: asSlides(full.data.slides) ?? [],
        sourceLyrics: typeof full.data.source_lyrics === 'string' ? full.data.source_lyrics : null,
        publishedSlides: asSlides(full.data.published_slides),
        publishedAt: typeof full.data.published_at === 'string' ? full.data.published_at : null,
      };
    }

    const withSource = await supabase
      .from('user_song_slides')
      .select('slides, source_lyrics')
      .eq('song_id', songId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (withSource.error || !withSource.data) return emptySlideCopy();
    return {
      slides: asSlides(withSource.data.slides) ?? [],
      sourceLyrics: typeof withSource.data.source_lyrics === 'string' ? withSource.data.source_lyrics : null,
      publishedSlides: null,
      publishedAt: null,
    };
  } catch {
    return emptySlideCopy();
  }
}

export async function loadUserCustomSlides(id: string): Promise<CustomSlideEdition | null> {
  const user = await getAuthUser();
  if (!user || !id) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_custom_slides')
      .select('id, title, source_lyrics, slides, published_slides, published_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return {
      id: data.id,
      title: typeof data.title === 'string' && data.title.trim() ? data.title : 'Música em branco',
      sourceLyrics: typeof data.source_lyrics === 'string' ? data.source_lyrics : '',
      slides: asSlides(data.slides) ?? [],
      publishedSlides: asSlides(data.published_slides),
      publishedAt: typeof data.published_at === 'string' ? data.published_at : null,
    };
  } catch {
    return null;
  }
}
