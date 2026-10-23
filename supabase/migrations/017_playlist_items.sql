-- Músicas incluídas à mão na playlist de um culto.
-- A lista que vem do Tom Louvores não é copiada para cá: ela é lida na hora.
-- culto_key segue o site de origem, por exemplo domingo_manha@2026-10-25.

create table if not exists public.playlist_items (
  id         uuid primary key default gen_random_uuid(),
  culto_key  text not null,
  title      text not null,
  song_id    uuid references public.songs (id) on delete set null,
  tom        text not null default '',
  section    text not null default 'principal'
    check (section in ('principal', 'ofertorio', 'pos', 'ceia')),
  position   integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists playlist_items_culto_idx
  on public.playlist_items (culto_key, section, position, created_at);

comment on table public.playlist_items is
  'Músicas adicionadas manualmente a um culto. A playlist do Tom Louvores é lida ao vivo e não fica nesta tabela.';

alter table public.playlist_items enable row level security;

drop policy if exists playlist_items_admin_all on public.playlist_items;
create policy playlist_items_admin_all on public.playlist_items
  for all using (public.is_admin()) with check (public.is_admin());

grant select, insert, update, delete on table public.playlist_items to authenticated;
