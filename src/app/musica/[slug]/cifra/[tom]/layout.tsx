import type { ReactNode } from 'react';
import { Suspense } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SongBackButton from '@/components/SongBackButton';

export default async function ChordLayout({
  children,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; tom: string }>;
}) {
  // Não bloqueia no fetch da música: o page.tsx trata 404/redirect e o
  // Suspense + cache local podem pintar a cifra antes da resposta do servidor.
  return (
    <>
      <SiteHeader
        left={
          <Suspense>
            <SongBackButton />
          </Suspense>
        }
      />
      <main className="shell">{children}</main>
    </>
  );
}
