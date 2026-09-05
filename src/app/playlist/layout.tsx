import { redirect } from 'next/navigation';
import { ADMIN_HOME, getAuthSession } from '@/lib/auth';

export default async function PlaylistLayout({ children }: { children: React.ReactNode }) {
  const { isAdmin } = await getAuthSession();
  if (isAdmin) redirect(ADMIN_HOME);
  return children;
}
