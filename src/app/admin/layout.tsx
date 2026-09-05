import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import SiteHeader from '@/components/SiteHeader';
import AdminBackButton from '@/components/AdminBackButton';
import { accountLabelFromEmail } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExternalLinkIcon } from '@/components/icons';

export const metadata: Metadata = { title: 'Administração', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login?next=%2Fadmin');

  const { data: isAdmin } = await supabase.rpc('is_admin');

  if (!isAdmin) redirect('/playlist');

  return (
    <>
      <SiteHeader left={<AdminBackButton />} />
      <div className="admin-bar no-print">
        <div className="admin-bar__inner">
          <Link href="/" target="_blank" className="admin-bar__action">
            Ver site
            <ExternalLinkIcon size={14} />
          </Link>
          <span className="header-spacer" />
          <span className="muted small">{accountLabelFromEmail(user.email)}</span>
        </div>
      </div>
      {children}
    </>
  );
}
