-- ============================================================================
-- Migração 003 — URL do YouTube por música
--
-- Rode este arquivo no SQL Editor do Supabase se o banco já existia.
-- Quem criar o banco pelo schema.sql atual não precisa desta migração.
-- ============================================================================

alter table public.songs
  add column if not exists youtube_url text;

comment on column public.songs.youtube_url is
  'Link do vídeo no YouTube. Se vazio, o ícone não aparece na página da música.';
