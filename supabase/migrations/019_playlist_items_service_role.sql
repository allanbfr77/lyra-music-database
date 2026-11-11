-- A API /api/v1/playlists lê playlist_items no servidor com a chave secreta
-- (service_role). Essa chave ignora o RLS, mas a tabela precisa dar SELECT a ela;
-- a 017 só concedeu ao papel `authenticated`. Somente leitura, de propósito.
-- Pode rodar o arquivo inteiro mais de uma vez.

grant select on table public.playlist_items to service_role;
