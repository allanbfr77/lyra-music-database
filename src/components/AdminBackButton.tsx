'use client';

import { usePathname } from 'next/navigation';
import { ChevronLeftIcon } from '@/components/icons';
import Link from 'next/link';

/** Aparece no header do admin quando o usuário está em uma sub-rota (nova / editar). */
export default function AdminBackButton() {
  const pathname = usePathname();
  if (pathname === '/admin') return null;

  return (
    <Link href="/admin" className="back-btn" aria-label="Voltar para Músicas">
      <ChevronLeftIcon size={18} />
    </Link>
  );
}
