import type { ReactNode } from 'react';
import SiteHeader from '@/components/SiteHeader';
import { getSongBySlug } from '@/lib/songs';
import { slugToKey } from '@/lib/chords';

export default async function ChordLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string; tom: string }>;
}) {
  const { slug, tom } = await params;
  const key = slugToKey(tom);
  const song = await getSongBySlug(slug).catch(() => null);

  // Página inválida: o page.tsx cuida do 404/redirect sem montar o leitor.
  if (!key || !song) return children;

  return (
    <>
      <SiteHeader />
      <main className="shell">{children}</main>
    </>
  );
}
