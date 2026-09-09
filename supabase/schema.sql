-- ============================================================================
-- Lyra Song Bank — schema completo
-- Cole este arquivo inteiro no SQL Editor do Supabase e execute uma única vez.
-- ============================================================================

create extension if not exists pgcrypto;
create extension if not exists unaccent;

-- ---------------------------------------------------------------------------
-- Configuração de busca: português + remoção de acentos
-- Faz "coracao" encontrar "coração".
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_ts_config c
    join pg_namespace n on n.oid = c.cfgnamespace
    where c.cfgname = 'pt_unaccent' and n.nspname = 'public'
  ) then
    create text search configuration public.pt_unaccent (copy = portuguese);
    alter text search configuration public.pt_unaccent
      alter mapping for hword, hword_part, word
      with unaccent, portuguese_stem;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Tabela: admins
-- Só quem estiver aqui pode cadastrar/editar músicas.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins a where a.user_id = auth.uid());
$$;

-- ---------------------------------------------------------------------------
-- Tabela: songs
-- ---------------------------------------------------------------------------
create table if not exists public.songs (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique,
  title          text not null,
  artist         text not null default '',
  lyrics         text not null default '',
  chords         text not null default '',      -- cifra base (acordes acima da letra)
  base_key       text not null default 'C',     -- tom em que a cifra base foi escrita
  available_keys text[] not null default '{}',  -- tons publicados p/ esta música
  capo           smallint not null default 0,
  tempo_bpm      smallint,
  time_signature text,
  language       text default 'pt-BR',
  source_url     text,
  youtube_url    text,
  notes          text,
  published      boolean not null default true,
  search_vector  tsvector,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

comment on column public.songs.chords is
  'Cifra base no formato texto, acordes em linhas próprias acima da letra.';
comment on column public.songs.available_keys is
  'Tons que ganham URL pública. O tom base é sempre incluído automaticamente.';
comment on column public.songs.youtube_url is
  'Link do vídeo no YouTube. Se vazio, o ícone não aparece na página da música.';

-- ---------------------------------------------------------------------------
-- Tabela: song_key_overrides
-- Sobrescrita manual da cifra de um tom específico (modo híbrido).
-- Se não existir registro, o tom é gerado por transposição automática.
-- ---------------------------------------------------------------------------
create table if not exists public.song_key_overrides (
  id         uuid primary key default gen_random_uuid(),
  song_id    uuid not null references public.songs (id) on delete cascade,
  key        text not null,
  chords     text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (song_id, key)
);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end
$$;

drop trigger if exists songs_touch_updated_at on public.songs;
create trigger songs_touch_updated_at
  before update on public.songs
  for each row execute function public.touch_updated_at();

drop trigger if exists overrides_touch_updated_at on public.song_key_overrides;
create trigger overrides_touch_updated_at
  before update on public.song_key_overrides
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Índice de busca (título, artista e letra)
-- ---------------------------------------------------------------------------
create or replace function public.songs_build_search_vector()
returns trigger language plpgsql as $$
begin
  new.search_vector :=
      setweight(to_tsvector('public.pt_unaccent', coalesce(new.title, '')),  'A')
    || setweight(to_tsvector('public.pt_unaccent', coalesce(new.artist, '')), 'B')
    || setweight(to_tsvector('public.pt_unaccent', coalesce(new.lyrics, '')), 'C');
  return new;
end
$$;

drop trigger if exists songs_search_vector on public.songs;
create trigger songs_search_vector
  before insert or update of title, artist, lyrics on public.songs
  for each row execute function public.songs_build_search_vector();

update public.songs set updated_at = updated_at;  -- popula o vetor em bases já existentes

create index if not exists songs_search_idx     on public.songs using gin (search_vector);
create index if not exists songs_title_trgm_idx on public.songs (lower(title));
create index if not exists songs_artist_idx     on public.songs (lower(artist));
create index if not exists songs_updated_idx    on public.songs (updated_at desc);
create index if not exists overrides_song_idx   on public.song_key_overrides (song_id);

-- ---------------------------------------------------------------------------
-- Busca usada pelo site e pelo Lyra
-- Título/artista: correspondência parcial (substring, sem acento).
-- Letra: full-text com prefixo ("gali" acha "Galileu").
--
-- O parâmetro `fields` restringe onde procurar, usando os pesos do índice:
--   A = título   B = artista   C = letra
-- Ex.: fields => 'AB' busca só em título e artista.
-- ---------------------------------------------------------------------------
drop function if exists public.search_songs(text, int, int);

create or replace function public.search_songs(
  q      text,
  lim    int  default 20,
  off    int  default 0,
  fields text default 'ABC'
)
returns table (
  id             uuid,
  slug           text,
  title          text,
  artist         text,
  base_key       text,
  available_keys text[],
  has_chords     boolean,
  snippet        text,
  updated_at     timestamptz,
  rank           real
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  weights   text;
  terms     text;
  tsq       tsquery;
  in_lyrics boolean;
  in_title  boolean;
  in_artist boolean;
  needle    text;
begin
  weights := regexp_replace(upper(coalesce(fields, 'ABC')), '[^ABC]', '', 'g');
  if weights = '' then
    weights := 'ABC';
  end if;
  in_title  := position('A' in weights) > 0;
  in_artist := position('B' in weights) > 0;
  in_lyrics := position('C' in weights) > 0;
  needle    := unaccent(lower(btrim(coalesce(q, ''))));

  if needle = '' then
    return query
      select s.id, s.slug, s.title, s.artist, s.base_key, s.available_keys,
             (length(btrim(s.chords)) > 0) as has_chords,
             left(regexp_replace(s.lyrics, '\s+', ' ', 'g'), 160) as snippet,
             s.updated_at,
             0::real as rank
      from public.songs s
      where s.published
      order by s.title asc
      limit greatest(lim, 0) offset greatest(off, 0);
    return;
  end if;

  if in_lyrics then
    select string_agg(s.w || ':*' || weights, ' & ')
      into terms
    from (
      select regexp_replace(lower(t), '[^[:alnum:]]', '', 'g') as w
      from unnest(regexp_split_to_array(coalesce(q, ''), '\s+')) as t
    ) s
    where s.w <> '';

    if terms is not null then
      tsq := to_tsquery('public.pt_unaccent', terms);
    end if;
  end if;

  return query
    select s.id, s.slug, s.title, s.artist, s.base_key, s.available_keys,
           (length(btrim(s.chords)) > 0) as has_chords,
           case when in_lyrics and tsq is not null then
             ts_headline(
               'public.pt_unaccent',
               regexp_replace(s.lyrics, '\s+', ' ', 'g'),
               tsq,
               'StartSel=[[,StopSel=]],MaxWords=22,MinWords=8,ShortWord=2,MaxFragments=1'
             )
           else
             left(regexp_replace(s.lyrics, '\s+', ' ', 'g'), 160)
           end as snippet,
           s.updated_at,
           (
             (case when in_title and unaccent(lower(s.title)) like '%' || needle || '%' then 0.6 else 0 end)
             + (case when in_artist and unaccent(lower(s.artist)) like '%' || needle || '%' then 0.3 else 0 end)
             + (case when tsq is not null then ts_rank(s.search_vector, tsq) else 0 end)
           )::real as rank
    from public.songs s
    where s.published and (
      (in_title and unaccent(lower(s.title)) like '%' || needle || '%')
      or (in_artist and unaccent(lower(s.artist)) like '%' || needle || '%')
      or (tsq is not null and s.search_vector @@ tsq)
    )
    order by rank desc, s.title asc
    limit greatest(lim, 0) offset greatest(off, 0);
end
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
--   • Qualquer pessoa (chave anon, sem login) LÊ músicas publicadas.
--   • Só administradores escrevem.
-- ---------------------------------------------------------------------------
alter table public.songs               enable row level security;
alter table public.song_key_overrides  enable row level security;
alter table public.admins              enable row level security;

drop policy if exists songs_public_read on public.songs;
create policy songs_public_read on public.songs
  for select using (published = true or public.is_admin());

drop policy if exists songs_admin_write on public.songs;
create policy songs_admin_write on public.songs
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists overrides_public_read on public.song_key_overrides;
create policy overrides_public_read on public.song_key_overrides
  for select using (
    public.is_admin() or exists (
      select 1 from public.songs s
      where s.id = song_key_overrides.song_id and s.published
    )
  );

drop policy if exists overrides_admin_write on public.song_key_overrides;
create policy overrides_admin_write on public.song_key_overrides
  for all using (public.is_admin()) with check (public.is_admin());

drop policy if exists admins_self_read on public.admins;
create policy admins_self_read on public.admins
  for select using (user_id = auth.uid());

grant execute on function public.search_songs(text, int, int, text) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ============================================================================
-- PASSO FINAL — tornar seu usuário administrador
--
-- 1. Authentication → Users → Add user → crie seu e-mail e senha
--    (marque "Auto Confirm User").
-- 2. Rode a linha abaixo trocando pelo seu e-mail:
--
-- insert into public.admins (user_id, email)
-- select id, email from auth.users where email = 'seu@email.com'
-- on conflict (user_id) do nothing;
-- ============================================================================
