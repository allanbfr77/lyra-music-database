import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

export type UserSlideCopy = {
  /** Blocos dos slides. null = ainda não tem cópia própria. */
  slides: string[] | null;
  /** Letra alternativa só para slides. null = fonte é a letra original. */
  sourceLyrics: string | null;
};

export function emptySlideCopy(): UserSlideCopy {
  return { slides: null, sourceLyrics: null };
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
    const withSource = await supabase
      .from('user_song_slides')
      .select('slides, source_lyrics')
      .eq('song_id', songId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!withSource.error) {
      if (!withSource.data) return emptySlideCopy();
      return {
        slides: Array.isArray(withSource.data.slides) ? withSource.data.slides : [],
        sourceLyrics: typeof withSource.data.source_lyrics === 'string' ? withSource.data.source_lyrics : null,
      };
    }

    const onlySlides = await supabase
      .from('user_song_slides')
      .select('slides')
      .eq('song_id', songId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (onlySlides.error || !onlySlides.data) return emptySlideCopy();
    return {
      slides: Array.isArray(onlySlides.data.slides) ? onlySlides.data.slides : [],
      sourceLyrics: null,
    };
  } catch {
    return emptySlideCopy();
  }
}
