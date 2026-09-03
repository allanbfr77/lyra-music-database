'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';

export type SignInState = { error: string | null };

export async function signIn(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = String(formData.get('email') ?? '').trim();
  const password = String(formData.get('password') ?? '');
  const nextRaw = String(formData.get('next') ?? '/admin');
  const next = nextRaw.startsWith('/') && !nextRaw.startsWith('//') ? nextRaw : '/admin';

  if (!email || !password) return { error: 'Informe e-mail e senha.' };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return {
        error:
          error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos.' : error.message,
      };
    }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Não foi possível entrar.' };
  }

  redirect(next);
}
