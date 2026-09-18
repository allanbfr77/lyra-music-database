-- ============================================================================
-- Migração 014 — título + artista únicos
--
-- A trava de duplicidade passa a considerar o par (título, artista).
-- Mesmo título com artistas diferentes é permitido; só bloqueia quando
-- título e artista coincidem (ignorando maiúsculas/minúsculas e espaços
-- nas pontas) — a mesma regra de src/app/admin/actions.ts.
-- ============================================================================

do $$
declare
  repetidos text;
begin
  select string_agg(d.t, ', ' order by d.t)
    into repetidos
  from (
    select lower(btrim(title)) || ' — ' || lower(btrim(coalesce(artist, ''))) as t
    from public.songs
    group by lower(btrim(title)), lower(btrim(coalesce(artist, '')))
    having count(*) > 1
  ) d;

  if repetidos is not null then
    raise exception
      'Existem músicas com o mesmo título e o mesmo artista: %. Ajuste ou exclua as duplicadas e rode esta migração novamente.',
      repetidos;
  end if;
end
$$;

drop index if exists public.songs_title_unico_idx;

create unique index if not exists songs_title_artist_unico_idx
  on public.songs (lower(btrim(title)), lower(btrim(coalesce(artist, ''))));
