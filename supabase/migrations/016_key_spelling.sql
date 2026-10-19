-- Grafia dos acidentes da música: 'sharp' (C#, D#, G#…) ou 'flat' (Db, Eb, Ab…).
-- Só muda o NOME exibido dos tons e acordes; o tom salvo (base_key) e os links continuam iguais.
-- null = automático (sustenidos, exceto tons com bemol na armadura: F, Bb, Eb, Ab, Db, Dm, Gm, Cm, Fm).
-- O Tom Louvores lê este campo pela API (/api/v1/songs/<slug>) e abre a cifra nessa grafia.
alter table public.songs
  add column if not exists key_spelling text
  check (key_spelling in ('sharp', 'flat'));

comment on column public.songs.key_spelling is
  'Grafia dos acidentes: sharp = sustenidos, flat = bemóis, null = automático pela armadura do tom.';
