import Link from 'next/link';
import { ChevronRightIcon } from '@/components/icons';
import type { PlaylistColumn } from '@/lib/playlist';
import { PlaylistAdd, PlaylistRemove } from '@/components/PlaylistControls';

export default function PlaylistBoard({
  columns,
  canAdd,
}: {
  columns: PlaylistColumn[];
  canAdd: boolean;
}) {
  if (columns.length === 0) {
    return <p className="setlist-none card">Nenhum culto neste dia.</p>;
  }

  return (
    <div className="setlist-board">
      {columns.map((column) => {
        const total = column.sections.reduce((sum, section) => sum + section.items.length, 0);
        return (
          <article key={column.key} className="card setlist-card">
            <header className="setlist-card__head">
              <div>
                <div className="setlist-card__title-row">
                  <h2 className="setlist-card__title">{column.title}</h2>
                  <span className="setlist-card__date">{column.dateLabel}</span>
                </div>
                <p className="setlist-card__sub">{column.subtitle}</p>
              </div>
              <span className="setlist-card__count">{column.countLabel}</span>
            </header>
            <p className="setlist-card__who">
              <span>Ministrante</span>
              <strong>{column.ministrante}</strong>
              {column.cancelado ? <span className="setlist-card__off">Cancelado</span> : null}
            </p>
            {total === 0 ? <p className="setlist-empty">Nenhum louvor adicionado.</p> : null}
            {column.sections.map((section) => (
              <section key={section.id} className="setlist-section" aria-label={section.label}>
                {section.showLabel ? <h3 className="setlist-section__label">{section.label}</h3> : null}
                <ul className="setlist-songs">
                  {section.items.map((item) => {
                    const body = (
                      <>
                        <span className="setlist-song__title">{item.title}</span>
                        {item.artist ? <span className="setlist-song__artist">{item.artist}</span> : null}
                        {!item.inBank && !item.manualId ? (
                          <span className="setlist-song__miss">Não está no banco</span>
                        ) : null}
                        {item.manualId ? <span className="setlist-song__tag">Manual</span> : null}
                      </>
                    );
                    return (
                      <li key={item.id} className="setlist-song">
                        <span className={`setlist-key${item.tom ? '' : ' setlist-key--empty'}`}>{item.tom || '—'}</span>
                        {item.href ? (
                          <Link href={item.href} className="setlist-song__main">
                            <span className="setlist-song__text">{body}</span>
                            <ChevronRightIcon size={16} className="setlist-song__chevron" />
                          </Link>
                        ) : (
                          <div className="setlist-song__main">
                            <span className="setlist-song__text">{body}</span>
                          </div>
                        )}
                        {item.manualId ? <PlaylistRemove id={item.manualId} title={item.title} /> : null}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
            {canAdd ? <PlaylistAdd cultoKey={column.key} taken={column.taken} /> : null}
            {column.updatedLabel ? <p className="setlist-card__updated">{column.updatedLabel}</p> : null}
          </article>
        );
      })}
    </div>
  );
}
