'use client';

import { createBrowserClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from '@/lib/env';

let cached: ReturnType<typeof createBrowserClient> | null = null;

/** Cliente do navegador — mantém a sessão do admin em cookies. */
export function createClient() {
  if (!cached) cached = createBrowserClient(supabaseUrl(), supabaseAnonKey());
  return cached;
}
