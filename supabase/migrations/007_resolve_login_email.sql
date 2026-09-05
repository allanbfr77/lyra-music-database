-- ============================================================================
-- Migração 007 — Login pelo nome (sem digitar o e-mail)
--
-- O Auth do Supabase continua exigindo e-mail. Esta função acha o e-mail da
-- conta pela parte antes do @, para a tela pedir só nome e senha.
-- ============================================================================

create or replace function public.resolve_login_email(p_login text)
returns text
language plpgsql
stable
security definer
set search_path = auth, public
as $$
declare
  v_login text := lower(trim(p_login));
  v_email text;
  v_count int;
begin
  if v_login is null or v_login = '' then
    return null;
  end if;

  if position('@' in v_login) > 0 then
    select u.email into v_email
    from auth.users u
    where lower(u.email) = v_login
    limit 1;
    return v_email;
  end if;

  select count(*) into v_count
  from auth.users u
  where lower(split_part(u.email, '@', 1)) = v_login;

  if v_count > 1 then
    raise exception 'ambiguous login';
  end if;

  if v_count = 1 then
    select u.email into v_email
    from auth.users u
    where lower(split_part(u.email, '@', 1)) = v_login;
    return v_email;
  end if;

  return null;
end;
$$;

comment on function public.resolve_login_email(text) is
  'Acha o e-mail do Auth a partir do nome (parte antes do @). Usada no login.';

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;
