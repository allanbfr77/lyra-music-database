import { createClient } from '@supabase/supabase-js';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';

/**
 * Cliente sem sessão, usado nas páginas públicas e na API do Lyra.
 * Enxerga apenas o que as políticas de RLS liberam para visitantes.
 */
export function createPublicClient() {
  return createClient(supabaseUrl(), supabaseAnonKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-application-name': 'lyra-songbank' } },
  });
}
