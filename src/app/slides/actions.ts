'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';

export type SaveSlidesResult = { ok: true } | { ok: false; error: string };

/** Grava a versão do usuário logado. Não altera a letra nem os slides de outra conta. */
export async function saveSongSlides(songId: string, slides: string[]): Promise<SaveSlidesResult> {
  if (!songId) return { ok: false, error: 'Música inválida.' };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

    const clean = slides.map((slide) => slide.replace(/\r\n/g, '\n'));
    const { error } = await supabase.rpc('save_song_slides', {
      p_song_id: songId,
      p_slides: clean,
    });
    if (error) return { ok: false, error: translate(error.message) };

    revalidatePath('/musica', 'layout');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível salvar os slides.' };
  }
}

function translate(message: string): string {
  if (message.includes('not authenticated')) return 'Sessão expirada. Entre novamente.';
  if (message.includes('save_song_slides') || message.includes('slides')) {
    return 'O banco ainda não tem slides por usuário. Execute supabase/migrations/006_user_song_slides.sql no SQL Editor do Supabase.';
  }
  return message;
}
