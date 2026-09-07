import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import LoginForm from '@/components/LoginForm';
import { safeNextPath } from '@/lib/auth';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNextPath(next);

  return (
    <>
      <SiteHeader />
      <main className="auth-wrap">
        <div className="auth-box">
          <p className="auth-label">AUTENTICAÇÃO</p>
          <h1 className="auth-title">Entrar</h1>
          <p className="auth-subtitle">Informe o nome e a senha da sua conta.</p>
          <LoginForm next={target} />
          <p className="auth-footnote">lyra.music.db — acesso restrito</p>
        </div>
      </main>
    </>
  );
}
