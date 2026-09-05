-- ============================================================================
-- Migração 005 — Slides independentes da letra
--
-- Rode este arquivo no SQL Editor do Supabase se o banco já existia.
-- A letra (songs.lyrics) nunca é escrita por esta função.
-- ============================================================================

alter table public.songs
  add column if not exists slides text[] not null default '{}';

comment on column public.songs.slides is
  'Blocos de texto dos slides. Independente de lyrics: editar slides não altera a letra.';

create or replace function public.save_song_slides(p_song_id uuid, p_slides text[])
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  update public.songs
     set slides = coalesce(p_slides, '{}')
   where id = p_song_id;
end;
$$;

revoke all on function public.save_song_slides(uuid, text[]) from public;
grant execute on function public.save_song_slides(uuid, text[]) to authenticated;
