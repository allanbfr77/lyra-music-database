-- The first song name in a culto stays.
-- A later insert with the same name is rejected. Sync must not delete or
-- rewrite a row that is already there; this only removes a later manual row
-- when that same culto already has the same name.
-- The key matches foldTitle in src/lib/playlist.ts: case, accents and
-- punctuation do not create a new name. Different words stay different.

create or replace function public.playlist_name_key(value text)
returns text
language sql
immutable
parallel safe
as $$
  select btrim(
    regexp_replace(
      lower(
        translate(
          btrim(coalesce(value, '')),
          'ÁÀÂÃÄÅÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑÝŸáàâãäåéèêëíìîïóòôõöúùûüçñýÿ',
          'AAAAAAEEEEIIIIOOOOOUUUUCNYYaaaaaaeeeeiiiiooooouuuucnyy'
        )
      ),
      '[^a-z0-9]+',
      ' ',
      'g'
    )
  );
$$;

delete from public.playlist_items as extra
where extra.id in (
  select ranked.id
  from (
    select
      id,
      row_number() over (
        partition by culto_key, public.playlist_name_key(title)
        order by created_at asc, id asc
      ) as n
    from public.playlist_items
    where public.playlist_name_key(title) <> ''
  ) as ranked
  where ranked.n > 1
);

create unique index if not exists playlist_items_nome_unico_idx
  on public.playlist_items (culto_key, public.playlist_name_key(title))
  where public.playlist_name_key(title) <> '';
