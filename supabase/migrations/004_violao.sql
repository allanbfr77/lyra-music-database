-- ============================================================================
-- Migração 004 — Cifra de violão/guitarra por música
--
-- Rode este arquivo no SQL Editor do Supabase se o banco já existia.
-- Quem criar o banco do zero deve aplicar esta migração depois do schema.sql
-- (o schema.sql original não é editado por esta mudança).
-- ============================================================================

-- Cifra base de violão, independente da de teclado (songs.chords).
alter table public.songs
  add column if not exists chords_guitar text not null default '';

comment on column public.songs.chords_guitar is
  'Cifra de violão/guitarra no mesmo formato da cifra de teclado. Vazio = ainda não cadastrada.';

-- Instrumento de cada ajuste manual. Linhas antigas viram teclado.
alter table public.song_key_overrides
  add column if not exists instrumento text not null default 'teclado';

comment on column public.song_key_overrides.instrumento is
  'Instrumento ao qual o ajuste manual se aplica: teclado ou violao.';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'song_key_overrides_instrumento_check'
      and conrelid = 'public.song_key_overrides'::regclass
  ) then
    alter table public.song_key_overrides
      add constraint song_key_overrides_instrumento_check
      check (instrumento in ('teclado', 'violao'));
  end if;
end
$$;

-- UNIQUE (song_id, key) impediria o mesmo tom nos dois instrumentos.
-- Passa a ser UNIQUE (song_id, key, instrumento).
do $$
declare
  r record;
begin
  for r in
    select c.conname
    from pg_constraint c
    where c.conrelid = 'public.song_key_overrides'::regclass
      and c.contype = 'u'
      and pg_get_constraintdef(c.oid) = 'UNIQUE (song_id, key)'
  loop
    execute format('alter table public.song_key_overrides drop constraint %I', r.conname);
  end loop;
end
$$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.song_key_overrides'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) = 'UNIQUE (song_id, key, instrumento)'
  ) then
    alter table public.song_key_overrides
      add constraint song_key_overrides_song_id_key_instrumento_key
      unique (song_id, key, instrumento);
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- GRANTs
--
-- No Postgres, GRANT SELECT/INSERT/UPDATE/DELETE na TABELA vale para todas
-- as colunas, inclusive as adicionadas depois. Não é necessário (nem
-- desejável) recriar GRANT por coluna: chords_guitar e instrumento herdam
-- os mesmos privilégios já concedidos a `songs` e `song_key_overrides`.
--
-- As políticas de RLS também não mudam — elas filtram por linha (published /
-- is_admin), não por coluna.
--
-- Abaixo só reafirmamos os GRANTs de tabela já esperados pelo PostgREST,
-- para o caso de algum ambiente ter privilégios incompletos. Idempotente.
-- ---------------------------------------------------------------------------
grant select on table public.songs to anon, authenticated;
grant insert, update, delete on table public.songs to authenticated;
grant select on table public.song_key_overrides to anon, authenticated;
grant insert, update, delete on table public.song_key_overrides to authenticated;
