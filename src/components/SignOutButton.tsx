'use client';

import { signOut } from '@/app/login/actions';
import { signOutAndClear } from '@/lib/client-sign-out';

export default function SignOutButton({ className = 'btn btn--ghost btn--sm' }: { className?: string }) {
  return (
    <form
      action={signOut}
      style={{ display: 'contents' }}
      onSubmit={(event) => {
        event.preventDefault();
        void signOutAndClear();
      }}
    >
      <button type="submit" className={className}>
        Sair
      </button>
    </form>
  );
}
