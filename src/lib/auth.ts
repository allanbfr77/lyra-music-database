import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

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
