'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import HomeCatalog from '@/components/HomeCatalog';
import SearchBox from '@/components/SearchBox';
import { catalogRevisionToken, sameCatalogRevision, type CatalogRevision, type LibrarySong } from '@/lib/catalog';
import {
  getCatalogMemory,
  hydrateAdminCatalog,
  revalidateCatalog,
  subscribeCatalog,
} from '@/lib/catalog-cache';
import { filterLibrary, prepareLibrary } from '@/lib/library-search';
import { SEARCH_FIELDS, parseFieldIds } from '@/lib/search-fields';

export type { LibrarySong };

export default function AdminCatalog({
  initialSongs,
  revision,
  loadError = null,
  initialQuery,
  initialFields,
}: {
  /** Songs embedded on this response. Null when the browser copy is already current. */
  initialSongs: LibrarySong[] | null;
  revision: CatalogRevision | null;
  loadError?: string | null;
  initialQuery: string;
  initialFields: string;
}) {
  const [songs, setSongs] = useState<LibrarySong[] | null>(initialSongs);
  const [ready, setReady] = useState(initialSongs !== null);
  const [failure, setFailure] = useState<string | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [fields, setFields] = useState(() => parseFieldIds(initialFields));
  const initialRef = useRef(initialSongs);
  const revisionRef = useRef(revision);
  initialRef.current = initialSongs;
  revisionRef.current = revision;

  const token = revision ? catalogRevisionToken(revision) : '';
  const embedded = initialSongs !== null;

  useEffect(() => {
    document.title = 'Lyra Database';
  }, []);

  useEffect(() => subscribeCatalog((snapshot) => {
    setSongs(snapshot.songs);
    setReady(true);
    setFailure(null);
  }), []);

  useLayoutEffect(() => {
    const cached = getCatalogMemory();
    if (!initialRef.current && cached) {
      const serverRevision = revisionRef.current;
      if (!serverRevision || sameCatalogRevision(cached.revision, serverRevision) || cached.songs.length) {
        setSongs(cached.songs);
        setReady(true);
      }
    }

    let cancel = false;
    void hydrateAdminCatalog({
      initialSongs: initialRef.current,
      revision: revisionRef.current,
    }).then((snapshot) => {
      if (cancel) return;
      if (!snapshot) {
        setReady(true);
        if (loadError) setFailure(loadError);
        return;
      }
      setSongs(snapshot.songs);
      setReady(true);
      setFailure(null);
    });
    return () => {
      cancel = true;
    };
  }, [token, embedded, loadError]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === 'visible') void revalidateCatalog();
    }
    function onPageShow(event: PageTransitionEvent) {
      if (event.persisted) void revalidateCatalog(true);
    }
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  const indexed = useMemo(() => prepareLibrary(songs ?? []), [songs]);
  const visible = useMemo(() => filterLibrary(indexed, query, fields), [indexed, query, fields]);

  const fieldLabels = SEARCH_FIELDS.filter((field) => fields.includes(field.id))
    .map((field) => field.label.toLowerCase())
    .join(', ');

  const search = (
    <SearchBox
      initialQuery={initialQuery}
      initialFields={initialFields}
      onSearch={(nextQuery, nextFields) => {
        setQuery(nextQuery);
        setFields(nextFields);
      }}
    />
  );

  if (failure) {
    return (
      <>
        <div className="query-panel">{search}</div>
        <div className="alert alert--error" style={{ marginTop: 18 }}>
          {failure}
        </div>
      </>
    );
  }

  return (
    <HomeCatalog
      search={search}
      songs={visible}
      query={query.trim()}
      fieldLabels={fieldLabels}
      showSnippet={Boolean(query.trim()) && fields.includes('l')}
      showReviewFilter
      admin
      pending={!ready}
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
