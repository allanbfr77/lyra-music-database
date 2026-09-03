import Link from 'next/link';
import { PlusIcon } from '@/components/icons';

export default function PlaylistFab() {
  return (
    <Link href="/playlist" className="playlist-fab no-print" aria-label="Criar playlist">
      <PlusIcon size={20} />
    </Link>
  );
}
