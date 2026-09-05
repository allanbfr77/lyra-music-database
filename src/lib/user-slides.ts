import { createClient } from '@/lib/supabase/server';
import { getAuthUser } from '@/lib/auth';

/**
 * Versão de slides do usuário logado para esta música.
 * null = ainda não tem cópia própria (usar o padrão da letra).
 */
export async function loadUserSongSlides(songId: string): Promise<string[] | null> {
  const user = await getAuthUser();
  if (!user || !songId) return null;

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('user_song_slides')
      .select('slides')
      .eq('song_id', songId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return Array.isArray(data.slides) ? data.slides : [];
  } catch {
    return null;
  }
}
