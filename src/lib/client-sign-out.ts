'use client';

import { signOut } from '@/app/login/actions';
import { clearPrivateBrowserData } from '@/lib/song-cache';

/** Ends the server session and drops lyrics kept in the browser. */
export async function signOutAndClear() {
  await clearPrivateBrowserData();
  await signOut();
}
