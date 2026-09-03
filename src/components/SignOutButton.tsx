'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function SignOutButton() {
  const router = useRouter();

  return (
    <button
      className="btn btn--ghost btn--sm"
      onClick={async () => {
        await createClient().auth.signOut();
        router.replace('/');
        router.refresh();
      }}
    >
      Sair
    </button>
  );
}
