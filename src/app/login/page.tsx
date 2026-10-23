import type { Metadata } from 'next';
import LoginForm from '@/components/LoginForm';
import LoginSessionCleanup from '@/components/LoginSessionCleanup';
import { ADMIN_HOME, safeNextPath } from '@/lib/auth';

export const metadata: Metadata = {
  title: { absolute: 'Login' },
  description: 'Banco de Músicas do Lyra. Acesso restrito.',
  robots: { index: false, follow: false },
  openGraph: {
    type: 'website',
    siteName: 'Banco de Músicas do Lyra',
    title: 'Banco de Músicas do Lyra',
    description: 'Acesso restrito.',
    locale: 'pt_BR',
    images: [{ url: '/icons/lyra-db-lockup-512.png', width: 512, height: 512, alt: 'Lyra.db' }],
  },
  twitter: {
    card: 'summary',
    title: 'Banco de Músicas do Lyra',
    description: 'Acesso restrito.',
  },
};

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const target = safeNextPath(next, ADMIN_HOME);

  return (
    <main className="auth-wrap">
      <LoginSessionCleanup />
      <div className="auth-box">
        <img
          className="auth-logo auth-logo--on-dark"
          src="/icons/lyra-db-favicon-dark.png"
          alt="Banco de Músicas do Lyra"
          width={72}
          height={72}
        />
        <img
          className="auth-logo auth-logo--on-light"
          src="/icons/lyra-db-favicon-light.png"
          alt=""
          width={72}
          height={72}
        />
        <h1 className="auth-title">Entrar</h1>
        <LoginForm next={target} />
      </div>
    </main>
  );
}
