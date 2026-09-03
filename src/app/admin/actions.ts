'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { normalizeKey } from '@/lib/chords';
import { slugify } from '@/lib/slug';
import { parseYoutubeUrl } from '@/lib/youtube';

export type SongPayload = {
  id?: string | null;
  slug: string;
  title: string;
  artist: string;
  lyrics: string;
  chords: string;
  base_key: string;
  available_keys: string[];
  capo: number;
  tempo_bpm: number | null;
  time_signature: string | null;
  source_url: string | null;
  youtube_url: string | null;
  notes: string | null;
  published: boolean;
  overrides: { key: string; chords: string }[];
};

type Result = { ok: true; id: string; slug: string } | { ok: false; error: string };

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Sessão expirada. Entre novamente.');

  const { data: isAdmin } = await supabase.rpc('is_admin');
  if (!isAdmin) throw new Error('Sua conta não está na lista de administradores.');

  return supabase;
}

export async function saveSong(payload: SongPayload): Promise<Result> {
  try {
    const supabase = await requireAdmin();

    const title = payload.title.trim();
    if (!title) return { ok: false, error: 'Informe o nome da música.' };

    const baseKey = normalizeKey(payload.base_key);
    const slug = slugify(payload.slug?.trim() || title);

    const youtubeRaw = payload.youtube_url?.trim() || '';
    const youtubeUrl = parseYoutubeUrl(youtubeRaw);
    if (youtubeRaw && !youtubeUrl) {
      return { ok: false, error: 'Informe um link válido do YouTube (ou deixe o campo vazio).' };
    }

    const record = {
      slug,
      title,
      artist: payload.artist.trim(),
      lyrics: payload.lyrics ?? '',
      chords: payload.chords ?? '',
      base_key: baseKey,
      available_keys: Array.from(
        new Set([baseKey, ...payload.available_keys.map((k) => normalizeKey(k, '')).filter(Boolean)])
      ),
      capo: Number.isFinite(payload.capo) ? Math.max(0, Math.min(12, payload.capo)) : 0,
      tempo_bpm: payload.tempo_bpm ?? null,
      time_signature: payload.time_signature?.trim() || null,
      source_url: payload.source_url?.trim() || null,
      youtube_url: youtubeUrl,
      notes: payload.notes?.trim() || null,
      published: payload.published,
    };

    let songId = payload.id ?? null;

    if (songId) {
      const { error } = await supabase.from('songs').update(record).eq('id', songId);
      if (error) return { ok: false, error: translate(error.message) };
    } else {
      const { data, error } = await supabase.from('songs').insert(record).select('id').single();
      if (error) return { ok: false, error: translate(error.message) };
      songId = data.id as string;
    }

    // Ajustes manuais de tom (modo híbrido)
    const wanted = payload.overrides
      .map((o) => ({ key: normalizeKey(o.key, ''), chords: o.chords }))
      .filter((o) => o.key && o.chords.trim().length > 0);

    const { data: existing } = await supabase.from('song_key_overrides').select('id, key').eq('song_id', songId);

    const keepKeys = new Set(wanted.map((o) => o.key));
    const toDelete = (existing ?? []).filter((row) => !keepKeys.has(normalizeKey(row.key))).map((row) => row.id);
    if (toDelete.length) {
      await supabase.from('song_key_overrides').delete().in('id', toDelete);
    }

    if (wanted.length) {
      const { error } = await supabase
        .from('song_key_overrides')
        .upsert(
          wanted.map((o) => ({ song_id: songId, key: o.key, chords: o.chords })),
          { onConflict: 'song_id,key' }
        );
      if (error) return { ok: false, error: translate(error.message) };
    }

    revalidatePath('/');
    revalidatePath('/admin');
    revalidatePath(`/musica/${slug}`, 'layout');

    return { ok: true, id: songId!, slug };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro inesperado ao salvar.' };
  }
}

export async function deleteSong(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const supabase = await requireAdmin();
    const { error } = await supabase.from('songs').delete().eq('id', id);
    if (error) return { ok: false, error: translate(error.message) };
    revalidatePath('/');
    revalidatePath('/admin');
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao excluir.' };
  }
}

function translate(message: string): string {
  if (message.includes('duplicate key') && message.includes('slug')) {
    return 'Já existe uma música com esse endereço (slug). Ajuste o campo "Endereço no site".';
  }
  if (message.includes('row-level security')) {
    return 'Sua conta não tem permissão de escrita. Confira se ela está na tabela admins.';
  }
  if (message.includes('youtube_url')) {
    return 'O banco ainda não tem o campo YouTube. Execute supabase/migrations/003_youtube_url.sql no SQL Editor do Supabase.';
  }
  return message;
}
