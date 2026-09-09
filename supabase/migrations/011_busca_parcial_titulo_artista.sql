-- ============================================================================
-- Migração 011 — correspondência parcial em título e artista
--
-- "Aquele Que" / "Está Feliz" passam a encontrar "Aquele Que Está Feliz".
-- Trecho da letra (peso C) continua via full-text search.
-- ============================================================================

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

grant execute on function public.search_songs(text, int, int, text) to anon, authenticated;
