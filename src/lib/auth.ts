import type { SupabaseClient, User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/** Fallback se a conta ainda não existir no Auth (ex.: nome@lyra.local). */
export const AUTH_LOGIN_DOMAIN = 'lyra.local';

const LOGIN_NAME_RE = /^[a-z0-9._+-]+$/;

type LoginEmailResult = { email: string } | { error: string };

/** Valida o que veio da tela: e-mail completo ou nome da conta. */
export function normalizeLogin(login: string): LoginEmailResult | { name: string } {
  const value = login.trim().toLowerCase();
  if (!value) return { error: 'Informe o nome e a senha.' };
  if (value.includes('@')) return { email: value };
  if (!LOGIN_NAME_RE.test(value)) {
    return { error: 'Use só letras, números, ponto, hífen ou underline.' };
  }
  return { name: value };
}

/**
 * Acha o e-mail real no Auth a partir do nome (parte antes do @).
 * Se a pessoa já digitou o e-mail completo, usa direto.
 */
export async function resolveLoginEmail(
  supabase: SupabaseClient,
  login: string
): Promise<LoginEmailResult> {
  const parsed = normalizeLogin(login);
  if ('error' in parsed) return parsed;
  if ('email' in parsed) return parsed;

  const { data, error } = await supabase.rpc('resolve_login_email', { p_login: parsed.name });
  if (error) {
    if (error.message.toLowerCase().includes('ambiguous login')) {
      return { error: 'Existe mais de uma conta com esse nome. Digite o e-mail completo.' };
    }
    return { email: `${parsed.name}@${AUTH_LOGIN_DOMAIN}` };
  }

  if (typeof data === 'string' && data.includes('@')) return { email: data };
  return { email: `${parsed.name}@${AUTH_LOGIN_DOMAIN}` };
}

/** Nome visível no cabeçalho: a parte antes do @, sempre em maiúsculas. */
export function accountLabelFromEmail(email: string | null | undefined): string {
  if (!email) return 'CONTA';
  const at = email.indexOf('@');
  const name = at <= 0 ? email : email.slice(0, at);
  return name.toUpperCase();
}

/** Sessão atual. Falha de ambiente ou de rede conta como visitante. */
export async function getAuthUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
}

/**
 * Quem pode abrir a aba Slides.
 * Por enquanto: qualquer conta autenticada (o login atual do site).
 * Depois este ponto troca para o login específico dessa área.
 */
export function canAccessSlides(user: User | null | undefined): boolean {
  return Boolean(user);
}

export async function currentUserCanAccessSlides(): Promise<boolean> {
  return canAccessSlides(await getAuthUser());
}

/** Destino padrão depois do login: playlist do culto, não a área admin. */
export const DEFAULT_AFTER_LOGIN = '/playlist';

/** Só aceita caminho interno. Evita open redirect. */
export function safeNextPath(raw: string | null | undefined, fallback = DEFAULT_AFTER_LOGIN): string {
  const value = String(raw ?? '').trim();
  if (value.startsWith('/') && !value.startsWith('//')) return value;
  return fallback;
}
