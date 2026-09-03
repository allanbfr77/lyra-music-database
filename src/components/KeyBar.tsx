import Link from 'next/link';
import { keyToSlug } from '@/lib/chords';

/**
 * Cada tom é um link permanente próprio: /musica/<slug>/cifra/<tom>.
 * Dá para favoritar direto a cifra da Galileu em A, por exemplo.
 */
export default function KeyBar({
  slug,
  keys,
  activeKey,
  manualKeys = [],
}: {
  slug: string;
  keys: string[];
  activeKey: string;
  manualKeys?: string[];
}) {
  return (
    <div className="keybar no-print">
      <div className="keybar__label">Tom</div>
      <div className="keybar__scroll">
        {keys.map((key) => (
          <Link
            key={key}
            href={`/musica/${slug}/cifra/${keyToSlug(key)}`}
            className="key-chip"
            data-active={key === activeKey}
            data-manual={manualKeys.includes(key)}
            aria-current={key === activeKey ? 'page' : undefined}
            scroll={false}
          >
            {key}
          </Link>
        ))}
      </div>
    </div>
  );
}
