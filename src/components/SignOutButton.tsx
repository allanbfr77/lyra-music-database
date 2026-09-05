'use client';

import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/browser';

export default function SignOutButton({ className = 'btn btn--ghost btn--sm' }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      type="button"
      className={className}
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
