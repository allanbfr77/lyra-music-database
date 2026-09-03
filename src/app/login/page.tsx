import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import LoginForm from '@/components/LoginForm';

export const metadata: Metadata = { title: 'Entrar', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = next && next.startsWith('/') ? next : '/admin';

  return (
    <>
      <SiteHeader />
      <main className="login-wrap">
        <h1 style={{ fontSize: 22, marginBottom: 6 }}>Área administrativa</h1>
        <p className="muted small" style={{ marginTop: 0, marginBottom: 22 }}>
          Só administradores cadastram e editam músicas. A consulta ao banco é livre para qualquer pessoa.
        </p>
        <LoginForm next={target} />
      </main>
    </>
  );
}
