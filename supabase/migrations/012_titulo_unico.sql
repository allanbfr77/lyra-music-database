-- ============================================================================
-- Migração 012 — título único
--
-- Trava de duplicidade: não pode existir mais de uma música com o mesmo
-- título, independentemente do artista. A comparação ignora maiúsculas/
-- minúsculas e espaços nas pontas — a mesma regra usada no cadastro
-- (src/app/admin/actions.ts).
--
-- Se a base já tiver títulos repetidos, o bloco abaixo interrompe a migração
-- e lista os títulos que precisam ser ajustados antes.
-- ============================================================================

do $$
declare
  repetidos text;
begin
  select string_agg(d.t, ', ' order by d.t)
    into repetidos
  from (
    select lower(btrim(title)) as t
    from public.songs
    group by lower(btrim(title))
    having count(*) > 1
  ) d;

  if repetidos is not null then
    raise exception
      'Existem músicas com título repetido: %. Ajuste ou exclua as duplicadas e rode esta migração novamente.',
      repetidos;
  end if;
end
$$;

create unique index if not exists songs_title_unico_idx
  on public.songs (lower(btrim(title)));
