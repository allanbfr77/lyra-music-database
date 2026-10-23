import type { Metadata } from 'next';
import SongEditor from '@/components/SongEditor';

export const metadata: Metadata = { title: { absolute: 'Editor - Lyra' } };
export const dynamic = 'force-dynamic';

export default function NewSongPage() {
  return <SongEditor />;
}
