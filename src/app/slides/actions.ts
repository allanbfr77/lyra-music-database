'use server';

import { revalidatePath } from 'next/cache';
import { accountLabelFromEmail } from '@/lib/auth';
import { lyricsToSlides } from '@/lib/slides';
import { createClient } from '@/lib/supabase/server';

export type SaveSlidesResult =
  | { ok: true; slides?: string[]; publishedSlides?: string[]; publishedAt?: string }
  | { ok: false; error: string };

async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function persistSlides(
  songId: string,
  slides: string[],
  sourceLyrics?: string | null
): Promise<SaveSlidesResult> {
  if (!songId) return { ok: false, error: 'Música inválida.' };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

    const clean = slides.map((slide) => slide.replace(/\r\n/g, '\n'));
    const payload: { p_song_id: string; p_slides: string[]; p_source_lyrics?: string } = {
      p_song_id: songId,
      p_slides: clean,
    };
    if (sourceLyrics != null) payload.p_source_lyrics = sourceLyrics.replace(/\r\n/g, '\n');

    const { error } = await supabase.rpc('save_song_slides', payload);
    if (error) return { ok: false, error: translate(error.message) };

    revalidatePath('/musica', 'layout');
    return { ok: true, slides: clean };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível salvar os slides.' };
  }
}

/** Grava a versão do usuário logado. Não altera a letra nem os slides de outra conta. */
export async function saveSongSlides(songId: string, slides: string[]): Promise<SaveSlidesResult> {
  return persistSlides(songId, slides);
}

/** Troca a fonte dos slides por uma letra colada. A letra original da música não muda. */
export async function importSlideLyrics(songId: string, lyrics: string): Promise<SaveSlidesResult> {
  const clean = lyrics.replace(/\r\n/g, '\n').trim();
  if (!clean) return { ok: false, error: 'Cole a letra alternativa.' };

  const slides = lyricsToSlides(clean);
  if (slides.length === 0) return { ok: false, error: 'Não foi possível gerar slides dessa letra.' };

  return persistSlides(songId, slides, clean);
}

/**
 * Remove a versão alternativa só deste usuário e volta os slides para a letra original.
 * Não escreve em songs.lyrics.
 */
export async function restoreOriginalSlideLyrics(songId: string): Promise<SaveSlidesResult> {
  if (!songId) return { ok: false, error: 'Música inválida.' };

  try {
    const { supabase, user } = await requireUser();
    if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

    const { data: song, error: songError } = await supabase
      .from('songs')
      .select('lyrics')
      .eq('id', songId)
      .maybeSingle();

    if (songError || !song) return { ok: false, error: 'Não foi possível ler a letra original.' };

    const slides = lyricsToSlides(typeof song.lyrics === 'string' ? song.lyrics : '');

    const existing = await supabase
      .from('user_song_slides')
      .select('published')
      .eq('song_id', songId)
      .eq('user_id', user.id)
      .maybeSingle();

    const alreadyPublished = Boolean(existing.data?.published);
    const { error } = alreadyPublished
      ? await supabase
          .from('user_song_slides')
          .update({ slides, source_lyrics: null })
          .eq('song_id', songId)
          .eq('user_id', user.id)
      : await supabase.from('user_song_slides').delete().eq('song_id', songId).eq('user_id', user.id);

    if (error) return { ok: false, error: translate(error.message) };

    revalidatePath('/musica', 'layout');
    return { ok: true, slides };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível restaurar a letra original.' };
  }
}

/** Disponibiliza a edição atual desta música para o programa Lyra. */
export async function publishSongSlidesToLyra(songId: string, slides: string[]): Promise<SaveSlidesResult> {
  if (!songId) return { ok: false, error: 'Música inválida.' };

  try {
    const { supabase, user } = await requireUser();
    if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

    const clean = slides.map((slide) => slide.replace(/\r\n/g, '\n'));
    if (clean.every((slide) => !slide.trim())) {
      return { ok: false, error: 'Não há slides para enviar.' };
    }

    const { error } = await supabase.rpc('publish_song_slides', {
      p_song_id: songId,
      p_slides: clean,
      p_author: accountLabelFromEmail(user.email),
    });
    if (error) return { ok: false, error: translate(error.message) };

    revalidatePath('/musica', 'layout');
    return { ok: true, slides: clean, publishedSlides: clean, publishedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível enviar para o programa.' };
  }
}

export async function saveCustomSlides(payload: {
  id: string;
  title: string;
  sourceLyrics: string;
  slides: string[];
}): Promise<SaveSlidesResult> {
  if (!payload.id) return { ok: false, error: 'Música inválida.' };

  try {
    const { supabase, user } = await requireUser();
    if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

    const slides = payload.slides.map((slide) => slide.replace(/\r\n/g, '\n'));
    const { error } = await supabase.rpc('save_custom_slides', {
      p_id: payload.id,
      p_title: payload.title.trim() || 'Música em branco',
      p_source_lyrics: payload.sourceLyrics.replace(/\r\n/g, '\n'),
      p_slides: slides,
    });
    if (error) return { ok: false, error: translate(error.message) };

    revalidatePath('/playlist', 'layout');
    return { ok: true, slides };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível salvar a música em branco.' };
  }
}

export async function publishCustomSlidesToLyra(payload: {
  id: string;
  title: string;
  sourceLyrics: string;
  slides: string[];
}): Promise<SaveSlidesResult> {
  if (!payload.id) return { ok: false, error: 'Música inválida.' };

  try {
    const { supabase, user } = await requireUser();
    if (!user) return { ok: false, error: 'Sessão expirada. Entre novamente.' };

    const slides = payload.slides.map((slide) => slide.replace(/\r\n/g, '\n'));
    if (slides.every((slide) => !slide.trim())) {
      return { ok: false, error: 'Não há slides para enviar.' };
    }

    const { error } = await supabase.rpc('publish_custom_slides', {
      p_id: payload.id,
      p_title: payload.title.trim() || 'Música em branco',
      p_source_lyrics: payload.sourceLyrics.replace(/\r\n/g, '\n'),
      p_slides: slides,
      p_author: accountLabelFromEmail(user.email),
    });
    if (error) return { ok: false, error: translate(error.message) };

    revalidatePath('/playlist', 'layout');
    return { ok: true, slides, publishedSlides: slides, publishedAt: new Date().toISOString() };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Não foi possível enviar para o programa.' };
  }
}

function translate(message: string): string {
  if (message.includes('not authenticated')) return 'Sessão expirada. Entre novamente.';
  if (message.includes('publish_') || message.includes('user_custom_slides') || message.includes('published')) {
    return 'O banco ainda não tem envio para o Lyra. Execute supabase/migrations/009_publish_slides_to_lyra.sql no SQL Editor do Supabase.';
  }
  if (message.includes('source_lyrics') || message.includes('PGRST204')) {
    return 'O banco ainda não tem letra alternativa nos slides. Execute supabase/migrations/008_slide_source_lyrics.sql no SQL Editor do Supabase.';
  }
  if (message.includes('save_song_slides') || message.includes('slides')) {
    return 'O banco ainda não tem slides por usuário. Execute supabase/migrations/006_user_song_slides.sql no SQL Editor do Supabase.';
  }
  return message;
}
