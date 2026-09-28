-- Status de revisão da letra: false = Revisar (padrão), true = Revisada.
-- Independente da revisão da cifra (chords_reviewed): cada uma tem seu próprio status,
-- e marcar uma como revisada não altera a outra.
alter table public.songs
  add column if not exists lyrics_reviewed boolean not null default false;

comment on column public.songs.lyrics_reviewed is
  'Revisão da letra: false = Revisar, true = Revisada. Ausência/falso = precisa revisar. Independente de chords_reviewed.';
