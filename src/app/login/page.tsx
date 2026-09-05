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
      <main className="login-wrap">
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Entrar</h1>
        <p className="muted small" style={{ marginTop: 0, marginBottom: 22 }}>
          Informe o nome e a senha da sua conta.
        </p>
        <LoginForm next={target} />
      </main>
    </>
  );
}
