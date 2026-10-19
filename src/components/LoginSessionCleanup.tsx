'use client';

import { useEffect } from 'react';
import { clearPrivateBrowserData } from '@/lib/song-cache';

/** Login means there is no session. Drop cached lyrics and page HTML. */
export default function LoginSessionCleanup() {
  useEffect(() => {
    void clearPrivateBrowserData();
  }, []);

  return null;
}
