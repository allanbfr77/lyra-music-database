-- ============================================================================
-- Migração 008 — Letra alternativa só para os slides
--
-- source_lyrics guarda uma letra colada pelo usuário para gerar/editar slides.
-- null = os slides continuam vindo da letra original (songs.lyrics).
-- songs.lyrics nunca é escrito por este fluxo.
-- ============================================================================

alter table public.user_song_slides
  add column if not exists source_lyrics text;

comment on column public.user_song_slides.source_lyrics is
  'Letra alternativa exclusiva dos slides. null = usa a letra original da música.';

drop function if exists public.save_song_slides(uuid, text[]);

create or replace function public.save_song_slides(
  p_song_id uuid,
  p_slides text[],
  p_source_lyrics text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_song_slides (user_id, song_id, slides, source_lyrics)
  values (auth.uid(), p_song_id, coalesce(p_slides, '{}'), p_source_lyrics)
  on conflict (user_id, song_id)
  do update set
    slides = excluded.slides,
    source_lyrics = coalesce(excluded.source_lyrics, public.user_song_slides.source_lyrics);
end;
$$;

revoke all on function public.save_song_slides(uuid, text[], text) from public;
grant execute on function public.save_song_slides(uuid, text[], text) to authenticated;
