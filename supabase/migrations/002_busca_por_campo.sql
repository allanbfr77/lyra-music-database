-- ============================================================================
-- Migração 002 — busca por campo (Artista / Música / Trecho da letra)
--
-- Rode este arquivo no SQL Editor do Supabase se você JÁ tinha criado o banco
-- com a versão anterior do schema.sql. Quem for criar o banco agora não
-- precisa: o schema.sql completo já inclui esta versão da função.
-- ============================================================================

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
  weights text;
  terms   text;
  tsq     tsquery;
  in_lyrics boolean;
begin
  weights := regexp_replace(upper(coalesce(fields, 'ABC')), '[^ABC]', '', 'g');
  if weights = '' then
    weights := 'ABC';
  end if;
  in_lyrics := position('C' in weights) > 0;

  select string_agg(s.w || ':*' || weights, ' & ')
    into terms
  from (
    select regexp_replace(lower(t), '[^[:alnum:]]', '', 'g') as w
    from unnest(regexp_split_to_array(coalesce(q, ''), '\s+')) as t
  ) s
  where s.w <> '';

  if terms is null then
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

  tsq := to_tsquery('public.pt_unaccent', terms);

  return query
    select s.id, s.slug, s.title, s.artist, s.base_key, s.available_keys,
           (length(btrim(s.chords)) > 0) as has_chords,
           case when in_lyrics then
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
           ts_rank(s.search_vector, tsq) as rank
    from public.songs s
    where s.published and s.search_vector @@ tsq
    order by ts_rank(s.search_vector, tsq) desc, s.title asc
    limit greatest(lim, 0) offset greatest(off, 0);
end
$$;

grant execute on function public.search_songs(text, int, int, text) to anon, authenticated;
