'use client';

import { useMemo, useState } from 'react';
import HomeCatalog from '@/components/HomeCatalog';
import SearchBox from '@/components/SearchBox';
import type { CatalogSong } from '@/components/SongList';
import { filterLibrary, prepareLibrary } from '@/lib/library-search';
import { SEARCH_FIELDS, parseFieldIds } from '@/lib/search-fields';

export type LibrarySong = CatalogSong & { lyrics: string };

export default function AdminCatalog({
  songs,
  initialQuery,
  initialFields,
}: {
  songs: LibrarySong[];
  initialQuery: string;
  initialFields: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [fields, setFields] = useState(() => parseFieldIds(initialFields));

  const indexed = useMemo(() => prepareLibrary(songs), [songs]);
  const visible = useMemo(() => filterLibrary(indexed, query, fields), [indexed, query, fields]);

  const fieldLabels = SEARCH_FIELDS.filter((field) => fields.includes(field.id))
    .map((field) => field.label.toLowerCase())
    .join(', ');

  return (
    <HomeCatalog
      search={
        <SearchBox
          initialQuery={initialQuery}
          initialFields={initialFields}
          onSearch={(nextQuery, nextFields) => {
            setQuery(nextQuery);
            setFields(nextFields);
          }}
        />
      }
      songs={visible}
      query={query.trim()}
      fieldLabels={fieldLabels}
      showSnippet={Boolean(query.trim()) && fields.includes('l')}
      showReviewFilter
      admin
      emptyNoQuery={{
        title: 'Nenhuma música cadastrada',
        hint: 'Comece cadastrando a primeira.',
      }}
      emptyNoResults={{
        title: 'Nada encontrado',
        hint: '',
      }}
    />
  );
}
