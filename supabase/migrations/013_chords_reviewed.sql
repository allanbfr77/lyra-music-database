-- Status de revisão da cifra: false = Revisar (padrão), true = Revisada.
-- Músicas existentes passam a Revisar sem alterar os demais dados.

alter table public.songs
  add column if not exists chords_reviewed boolean not null default false;

comment on column public.songs.chords_reviewed is
  'Revisão da cifra: false = Revisar, true = Revisada. Ausência/falso = precisa revisar.';
