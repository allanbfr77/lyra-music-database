'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import {
  PLAYLIST_MIGRATION_HINT,
  SECTIONS,
  titlesMatch,
  isPlaylistTableMissing,
  parseSection,
  type SectionId,
} from '@/lib/playlist';
import { isIsoDate, loadRemoteCultos } from '@/lib/tom-louvores';

export type PlaylistSongHit = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  base_key: string;
};

type Result = { ok: true } | { ok: false; error: string };

const CULTO_KEY = /^(quarta|domingo_manha|domingo_noite|extra)@(\d{4}-\d{2}-\d{2})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function fail(message: string): Result {
  return { ok: false, error: message };
}

function dbError(message: string): Result {
  if (isPlaylistTableMissing(message)) return fail(PLAYLIST_MIGRATION_HINT);
  return fail('Não foi possível salvar a playlist.');
}

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

function parseCultoKey(value: string): { key: string; date: string } | null {
  const match = value.match(CULTO_KEY);
  if (!match || !isIsoDate(match[2])) return null;
  return { key: match[0], date: match[2] };
}

export async function searchPlaylistSongs(query: string): Promise<PlaylistSongHit[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  try {
    const supabase = await requireAdmin();
    const { accentInsensitiveOr } = await import('@/lib/text-fold');
    const filter = accentInsensitiveOr(['title', 'artist'], q);
    if (!filter) return [];

    const { data, error } = await supabase
      .from('songs')
      .select('id, slug, title, artist, base_key')
      .or(filter)
      .order('title', { ascending: true })
      .limit(8);
    if (error) return [];

    return ((data ?? []) as PlaylistSongHit[]).map((song) => ({
      id: song.id,
      slug: song.slug,
      title: song.title,
      artist: song.artist ?? '',
      base_key: song.base_key ?? '',
    }));
  } catch {
    return [];
  }
}

export async function addPlaylistSong(input: {
  cultoKey: string;
  songId?: string | null;
  title?: string | null;
  tom?: string | null;
  section?: string | null;
}): Promise<Result> {
  try {
    const culto = parseCultoKey(input.cultoKey ?? '');
    if (!culto) return fail('Culto inválido.');

    const section: SectionId = parseSection(input.section);
    if (!SECTIONS.some((item) => item.id === section)) return fail('Seção inválida.');

    const supabase = await requireAdmin();
    const songId = (input.songId ?? '').trim();
    let title = (input.title ?? '').trim().replace(/\s+/g, ' ');
    let tom = (input.tom ?? '').trim();

    if (songId) {
      if (!UUID.test(songId)) return fail('Música inválida.');
      const { data: song, error } = await supabase
        .from('songs')
        .select('id, title, base_key')
        .eq('id', songId)
        .maybeSingle();
      if (error) return dbError(error.message);
      if (!song) return fail('Música não encontrada no banco.');
      title = String(song.title ?? '').trim();
      if (!tom) tom = String(song.base_key ?? '').trim();
    }

    if (title.length < 2) return fail('Informe o nome da música.');
    if (title.length > 180) return fail('O nome da música está longo demais.');
    if (tom.length > 12) tom = tom.slice(0, 12);

    const remote = await loadRemoteCultos();
    if (remote.ok) {
      const cultoRow = remote.cultos.find((item) => `${item.tipo}@${item.data}` === culto.key);
      const already = cultoRow?.louvores.some((item) => titlesMatch(item.nome, title));
      if (already) return fail('Essa música já está neste culto.');
    }

    const { data: existing, error: existingError } = await supabase
      .from('playlist_items')
      .select('id, title, song_id')
      .eq('culto_key', culto.key);
    if (existingError) return dbError(existingError.message);

    const duplicate = (existing ?? []).some((row) => {
      if (songId && row.song_id === songId) return true;
      return titlesMatch(String(row.title ?? ''), title);
    });
    if (duplicate) return fail('Essa música já está neste culto.');

    const { data: last, error: lastError } = await supabase
      .from('playlist_items')
      .select('position')
      .eq('culto_key', culto.key)
      .eq('section', section)
      .order('position', { ascending: false })
      .limit(1);
    if (lastError) return dbError(lastError.message);
    const position = (last?.[0]?.position ?? 0) + 1;

    const { error } = await supabase.from('playlist_items').insert({
      culto_key: culto.key,
      title,
      song_id: songId || null,
      tom,
      section,
      position,
    });
    if (error) return dbError(error.message);

    revalidatePath('/playlist');
    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Não foi possível adicionar a música.');
  }
}

export async function removePlaylistSong(id: string): Promise<Result> {
  try {
    if (!UUID.test(id)) return fail('Item inválido.');
    const supabase = await requireAdmin();
    const { error } = await supabase.from('playlist_items').delete().eq('id', id);
    if (error) return dbError(error.message);
    revalidatePath('/playlist');
    return { ok: true };
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'Não foi possível remover a música.');
  }
}
