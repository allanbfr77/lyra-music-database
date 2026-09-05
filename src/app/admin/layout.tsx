import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import AdminBackButton from '@/components/AdminBackButton';
import { ADMIN_HOME, USER_HOME, getAuthSession } from '@/lib/auth';

export const metadata: Metadata = { title: 'Administração', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAdmin } = await getAuthSession();

  if (!user) redirect(`/login?next=${encodeURIComponent(ADMIN_HOME)}`);
  if (!isAdmin) redirect(USER_HOME);

  return (
    <>
      <SiteHeader left={<AdminBackButton />} homeHref={ADMIN_HOME} />
      <div className="admin-bar no-print">
        <div className="admin-bar__inner">
          <span>Painel administrativo</span>
        </div>
      </div>
      {children}
    </>
  );
}
