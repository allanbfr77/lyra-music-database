import Link from 'next/link';
import { ChevronLeftIcon } from '@/components/icons';

export default function SongBackButton() {
  return (
    <Link href="/" className="back-btn" aria-label="Voltar">
      <ChevronLeftIcon size={18} />
    </Link>
  );
}
