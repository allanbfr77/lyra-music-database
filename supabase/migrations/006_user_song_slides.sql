-- ============================================================================
-- Migração 006 — Slides por usuário (user + música)
--
-- Cada conta autenticada tem a própria versão dos slides de cada música.
-- A letra (songs.lyrics) nunca é escrita. O campo songs.slides deixa de ser
-- o destino das edições (ficou compartilhado e foi substituído por esta tabela).
-- ============================================================================

create table if not exists public.user_song_slides (
  user_id    uuid not null references auth.users (id) on delete cascade,
  song_id    uuid not null references public.songs (id) on delete cascade,
  slides     text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, song_id)
);

comment on table public.user_song_slides is
  'Versão pessoal dos slides: uma linha por (usuário, música). Isolada da letra e dos outros usuários.';

drop trigger if exists user_song_slides_touch_updated_at on public.user_song_slides;
create trigger user_song_slides_touch_updated_at
  before update on public.user_song_slides
  for each row execute function public.touch_updated_at();

alter table public.user_song_slides enable row level security;

drop policy if exists user_slides_select_own on public.user_song_slides;
create policy user_slides_select_own on public.user_song_slides
  for select using (user_id = auth.uid());

drop policy if exists user_slides_insert_own on public.user_song_slides;
create policy user_slides_insert_own on public.user_song_slides
  for insert with check (user_id = auth.uid());

drop policy if exists user_slides_update_own on public.user_song_slides;
create policy user_slides_update_own on public.user_song_slides
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists user_slides_delete_own on public.user_song_slides;
create policy user_slides_delete_own on public.user_song_slides
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on table public.user_song_slides to authenticated;

-- Substitui a função da 005: agora grava na linha do usuário logado, nunca em songs.
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

  insert into public.user_song_slides (user_id, song_id, slides)
  values (auth.uid(), p_song_id, coalesce(p_slides, '{}'))
  on conflict (user_id, song_id)
  do update set slides = excluded.slides;
end;
$$;

revoke all on function public.save_song_slides(uuid, text[]) from public;
grant execute on function public.save_song_slides(uuid, text[]) to authenticated;
