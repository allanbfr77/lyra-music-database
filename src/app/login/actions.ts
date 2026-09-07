'use server';

import { redirect } from 'next/navigation';
import { destinationForRole, resolveLoginEmail } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export type SignInState = { error: string | null };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const login = String(formData.get('login') ?? '');
  const password = String(formData.get('password') ?? '');
  const requestedNext = String(formData.get('next') ?? '');

  if (!password) return { error: 'Informe o nome e a senha.' };

  try {
    const supabase = await createClient();
    const resolved = await resolveLoginEmail(supabase, login);
    if ('error' in resolved) return { error: resolved.error };

    const { error } = await supabase.auth.signInWithPassword({
      email: resolved.email,
      password,
    });
    if (error) {
      return {
        error:
          error.message === 'Invalid login credentials' ? 'Nome ou senha incorretos.' : error.message,
      };
    }

    let isAdmin = false;
    try {
      const { data } = await supabase.rpc('is_admin');
      isAdmin = Boolean(data);
    } catch {
      isAdmin = false;
    }

    if (!isAdmin) {
      await supabase.auth.signOut();
      return { error: 'Acesso restrito a administradores.' };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Não foi possível entrar.' };
  }

  redirect(destinationForRole(true, requestedNext));
}
