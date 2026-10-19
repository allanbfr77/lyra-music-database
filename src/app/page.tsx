import { redirect } from 'next/navigation';
import { ADMIN_HOME } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** The only signed-in home is the admin panel. */
export default function HomePage() {
  redirect(ADMIN_HOME);
}
