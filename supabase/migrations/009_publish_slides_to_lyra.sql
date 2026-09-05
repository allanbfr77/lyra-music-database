-- ============================================================================
-- Migração 009 — Edição salva x versão enviada ao Lyra
--
-- A edição contínua (slides / source_lyrics) continua só do usuário.
-- published_* é o recorte que o programa Lyra pode importar.
-- songs.lyrics nunca é escrito.
-- ============================================================================

alter table public.user_song_slides
  add column if not exists published boolean not null default false,
  add column if not exists published_at timestamptz,
  add column if not exists published_slides text[],
  add column if not exists published_source_lyrics text,
  add column if not exists published_author text;

comment on column public.user_song_slides.published is
  'true só depois de Enviar para o programa. Edição salva sozinha não libera importação.';

create table if not exists public.user_custom_slides (
  id                      uuid primary key,
  user_id                 uuid not null references auth.users (id) on delete cascade,
  title                   text not null default 'Música em branco',
  source_lyrics           text not null default '',
  slides                  text[] not null default '{}',
  published               boolean not null default false,
  published_at            timestamptz,
  published_slides        text[],
  published_title         text,
  published_source_lyrics text,
  published_author        text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

comment on table public.user_custom_slides is
  'Música em branco / medley: edição pessoal. Só published=true vai para o Lyra.';

drop trigger if exists user_custom_slides_touch_updated_at on public.user_custom_slides;
create trigger user_custom_slides_touch_updated_at
  before update on public.user_custom_slides
  for each row execute function public.touch_updated_at();

alter table public.user_custom_slides enable row level security;

drop policy if exists custom_slides_select_own on public.user_custom_slides;
create policy custom_slides_select_own on public.user_custom_slides
  for select using (user_id = auth.uid());

drop policy if exists custom_slides_insert_own on public.user_custom_slides;
create policy custom_slides_insert_own on public.user_custom_slides
  for insert with check (user_id = auth.uid());

drop policy if exists custom_slides_update_own on public.user_custom_slides;
create policy custom_slides_update_own on public.user_custom_slides
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists custom_slides_delete_own on public.user_custom_slides;
create policy custom_slides_delete_own on public.user_custom_slides
  for delete using (user_id = auth.uid());

grant select, insert, update, delete on table public.user_custom_slides to authenticated;

-- A API do Lyra lê só o recorte publicado, nunca a edição de trabalho.
drop policy if exists user_slides_select_published on public.user_song_slides;
revoke select on table public.user_song_slides from anon;
revoke select on table public.user_custom_slides from anon;

create or replace view public.lyra_published_song_slides as
select
  user_id,
  song_id,
  published_slides,
  published_source_lyrics,
  published_author,
  published_at
from public.user_song_slides
where published = true
  and published_slides is not null
  and cardinality(published_slides) > 0;

create or replace view public.lyra_published_custom_slides as
select
  id,
  user_id,
  published_title,
  published_source_lyrics,
  published_slides,
  published_author,
  published_at
from public.user_custom_slides
where published = true
  and published_slides is not null
  and cardinality(published_slides) > 0;

comment on view public.lyra_published_song_slides is
  'Somente versões já enviadas ao Lyra. A edição salva e não enviada não aparece.';
comment on view public.lyra_published_custom_slides is
  'Medleys / músicas em branco já enviados ao Lyra.';

alter view public.lyra_published_song_slides set (security_invoker = false);
alter view public.lyra_published_custom_slides set (security_invoker = false);

grant select on public.lyra_published_song_slides to anon, authenticated;
grant select on public.lyra_published_custom_slides to anon, authenticated;

create or replace function public.list_published_song_slides(p_song_id uuid default null)
returns table (
  user_id uuid,
  song_id uuid,
  published_slides text[],
  published_source_lyrics text,
  published_author text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.user_id,
    s.song_id,
    s.published_slides,
    s.published_source_lyrics,
    s.published_author,
    s.published_at
  from public.user_song_slides s
  where s.published = true
    and s.published_slides is not null
    and cardinality(s.published_slides) > 0
    and (p_song_id is null or s.song_id = p_song_id)
  order by s.published_at asc;
$$;

create or replace function public.list_published_custom_slides()
returns table (
  id uuid,
  published_title text,
  published_source_lyrics text,
  published_slides text[],
  published_author text,
  published_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    c.published_title,
    c.published_source_lyrics,
    c.published_slides,
    c.published_author,
    c.published_at
  from public.user_custom_slides c
  where c.published = true
    and c.published_slides is not null
    and cardinality(c.published_slides) > 0
  order by c.published_at asc;
$$;

revoke all on function public.list_published_song_slides(uuid) from public;
revoke all on function public.list_published_custom_slides() from public;
grant execute on function public.list_published_song_slides(uuid) to anon, authenticated;
grant execute on function public.list_published_custom_slides() to anon, authenticated;

-- Grava só a edição de trabalho. Não publica para o Lyra.
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

create or replace function public.publish_song_slides(
  p_song_id uuid,
  p_slides text[],
  p_author text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  insert into public.user_song_slides (user_id, song_id, slides)
  values (auth.uid(), p_song_id, coalesce(p_slides, '{}'))
  on conflict (user_id, song_id)
  do update set slides = coalesce(p_slides, public.user_song_slides.slides);

  select source_lyrics into v_source
  from public.user_song_slides
  where user_id = auth.uid() and song_id = p_song_id;

  update public.user_song_slides
  set
    published = true,
    published_at = now(),
    published_slides = slides,
    published_source_lyrics = v_source,
    published_author = nullif(trim(p_author), '')
  where user_id = auth.uid() and song_id = p_song_id;
end;
$$;

revoke all on function public.publish_song_slides(uuid, text[], text) from public;
grant execute on function public.publish_song_slides(uuid, text[], text) to authenticated;

create or replace function public.save_custom_slides(
  p_id uuid,
  p_title text,
  p_source_lyrics text,
  p_slides text[]
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

  insert into public.user_custom_slides (id, user_id, title, source_lyrics, slides)
  values (
    p_id,
    auth.uid(),
    coalesce(nullif(trim(p_title), ''), 'Música em branco'),
    coalesce(p_source_lyrics, ''),
    coalesce(p_slides, '{}')
  )
  on conflict (id)
  do update set
    title = excluded.title,
    source_lyrics = excluded.source_lyrics,
    slides = excluded.slides
  where public.user_custom_slides.user_id = auth.uid();
end;
$$;

revoke all on function public.save_custom_slides(uuid, text, text, text[]) from public;
grant execute on function public.save_custom_slides(uuid, text, text, text[]) to authenticated;

create or replace function public.publish_custom_slides(
  p_id uuid,
  p_title text,
  p_source_lyrics text,
  p_slides text[],
  p_author text default null
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

  perform public.save_custom_slides(p_id, p_title, p_source_lyrics, p_slides);

  update public.user_custom_slides
  set
    published = true,
    published_at = now(),
    published_slides = slides,
    published_title = title,
    published_source_lyrics = source_lyrics,
    published_author = nullif(trim(p_author), '')
  where id = p_id and user_id = auth.uid();
end;
$$;

revoke all on function public.publish_custom_slides(uuid, text, text, text[], text) from public;
grant execute on function public.publish_custom_slides(uuid, text, text, text[], text) to authenticated;
