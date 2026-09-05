-- ============================================================================
-- Migração 010 — Conta MDC.INVB vira ADMIN
--
-- Troca o login (parte antes do @) para admin e coloca a conta na tabela
-- admins, para entrar no painel administrativo.
-- A senha permanece a mesma.
-- ============================================================================

do $$
declare
  v_id uuid;
  v_email text;
  v_new_email text;
begin
  select u.id, u.email into v_id, v_email
  from auth.users u
  where lower(u.email) = 'mdc.invb@gmail.com'
     or lower(split_part(u.email, '@', 1)) = 'mdc.invb'
  limit 1;

  if v_id is null then
    raise exception 'Usuário MDC.INVB não encontrado.';
  end if;

  v_new_email := 'admin@' || split_part(v_email, '@', 2);

  if exists (
    select 1 from auth.users u
    where lower(u.email) = lower(v_new_email)
      and u.id <> v_id
  ) then
    raise exception 'Já existe outra conta com o e-mail %.', v_new_email;
  end if;

  update auth.users
  set
    email = v_new_email,
    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb)
      || jsonb_build_object('email', v_new_email),
    updated_at = now()
  where id = v_id;

  update auth.identities
  set
    identity_data = identity_data || jsonb_build_object('email', v_new_email),
    updated_at = now()
  where user_id = v_id;

  insert into public.admins (user_id, email)
  values (v_id, v_new_email)
  on conflict (user_id) do update set email = excluded.email;
end
$$;
