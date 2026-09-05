'use client';

import { useActionState } from 'react';
import { signIn, type SignInState } from '@/app/login/actions';

const INITIAL: SignInState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, action, busy] = useActionState(signIn, INITIAL);

  return (
    <form action={action} className="card">
      <input type="hidden" name="next" value={next} />
      {state.error && <div className="alert alert--error">{state.error}</div>}

      <label className="field">
        <span className="field__label">Nome</span>
        <input
          className="input"
          type="text"
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </label>

      <label className="field">
        <span className="field__label">Senha</span>
        <input
          className="input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>

      <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
