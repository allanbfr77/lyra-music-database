'use client';

import { useActionState } from 'react';
import { signIn, type SignInState } from '@/app/login/actions';

const INITIAL: SignInState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, action, busy] = useActionState(signIn, INITIAL);

  return (
    <form action={action} className="auth-panel">
      <input type="hidden" name="next" value={next} />
      {state.error && <div className="alert alert--error">{state.error}</div>}

      <label className="auth-field">
        <span className="auth-field__label">NOME</span>
        <input
          className="auth-field__input"
          type="text"
          name="login"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          required
        />
      </label>

      <label className="auth-field">
        <span className="auth-field__label">SENHA</span>
        <input
          className="auth-field__input"
          type="password"
          name="password"
          autoComplete="current-password"
          required
        />
      </label>

      <button className="auth-submit" type="submit" disabled={busy}>
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  );
}
