import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import SignOutButton from '@/components/SignOutButton';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Administração', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=%2Fadmin');

  const { data: isAdmin } = await supabase.rpc('is_admin');

  if (!isAdmin) {
    return (
      <>
        <SiteHeader right={<SignOutButton />} />
        <main className="shell">
          <div className="empty" style={{ marginTop: 40 }}>
            <strong>Sem permissão</strong>
            <span className="small">
              A conta <b>{user.email}</b> está autenticada, mas não é administradora. Adicione-a na tabela{' '}
              <code>admins</code> do Supabase.
            </span>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader right={<SignOutButton />} />
      <div className="admin-bar no-print">
        <div className="admin-bar__inner">
          <Link href="/admin">Músicas</Link>
          <Link href="/admin/nova">+ Nova</Link>
          <Link href="/" target="_blank">
            Ver site ↗
          </Link>
          <span className="header-spacer" />
          <span className="muted small">{user.email}</span>
        </div>
      </div>
      {children}
    </>
  );
}
