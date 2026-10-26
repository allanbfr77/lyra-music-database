/**
 * Playlist name rule. Run with: npm run test:playlist
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildPlaylistColumns,
  buildSongIndex,
  complementText,
  emptyTomFills,
  foldTitle,
  titlesMatch,
  type ManualPlaylistItem,
  type SongRef,
} from '../src/lib/playlist.ts';
import type { RemoteCulto, RemoteLouvor } from '../src/lib/tom-louvores.ts';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const left = JSON.stringify(actual);
  const right = JSON.stringify(expected);
  if (left === right) {
    console.log(`  ok   ${name}`);
    return;
  }
  failures += 1;
  console.error(`  FAIL ${name}`);
  console.error(`       got      ${left}`);
  console.error(`       expected ${right}`);
}

const DATE = '2026-10-25';
const MANHA = `domingo_manha@${DATE}`;
const NOITE = `domingo_noite@${DATE}`;

const bank: SongRef[] = [
  { id: 'song-obras', slug: 'deus-de-obras', title: 'Deus de Obras', artist: 'Igreja' },
  { id: 'song-completa', slug: 'deus-de-obras-completa', title: 'Deus de Obras Completa', artist: 'Igreja' },
];

function louvor(nome: string, tom: string, flags: Partial<Pick<RemoteLouvor, 'ofertorio' | 'pos' | 'ceia'>> = {}): RemoteLouvor {
  return {
    nome,
    tom,
    ofertorio: flags.ofertorio === true,
    pos: flags.pos === true,
    ceia: flags.ceia === true,
  };
}

function culto(tipo: string, louvores: RemoteLouvor[]): RemoteCulto {
  return {
    id: tipo,
    tipo,
    data: DATE,
    nome: null,
    cancelado: false,
    ministrante: 'Ana',
    atualizadoEm: '2026-10-20T12:00:00Z',
    louvores,
  };
}

function manual(partial: Partial<ManualPlaylistItem> & Pick<ManualPlaylistItem, 'id' | 'title'>): ManualPlaylistItem {
  return {
    cultoKey: MANHA,
    tom: 'G',
    section: 'principal',
    songId: null,
    song: null,
    createdAt: '2026-10-01T00:00:00Z',
    ...partial,
  };
}

function shown(cultos: RemoteCulto[], items: ManualPlaylistItem[], key = MANHA) {
  const columns = buildPlaylistColumns(DATE, cultos, items, buildSongIndex(bank));
  const column = columns.find((item) => item.key === key);
  return {
    items: (column?.sections ?? []).flatMap((section) =>
      section.items.map((item) => ({
        section: section.id,
        title: item.title,
        tom: item.tom,
        manualId: item.manualId,
      }))
    ),
    taken: column?.taken ?? [],
  };
}

console.log('playlist name rule');

function sqlNameKey(value: string): string {
  const sql = readFileSync(join(process.cwd(), 'supabase/migrations/018_playlist_nome_unico.sql'), 'utf8');
  const match = sql.match(/translate\(\s*btrim\(coalesce\(value, ''\)\),\s*'([^']*)',\s*'([^']*)'/);
  if (!match) throw new Error('playlist_name_key translate lists were not found');
  const from = match[1];
  const to = match[2];
  if ([...from].length !== [...to].length) {
    throw new Error(`translate lists differ: ${[...from].length} vs ${[...to].length}`);
  }
  const map = new Map([...from].map((char, index) => [char, [...to][index]]));
  const translated = [...value.trim()].map((char) => map.get(char) ?? char).join('');
  return translated
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

for (const name of [
  'Deus de Obras Completa',
  'deus de obras completa!',
  'Deus de Obras',
  'Deus de Obras - Completa',
  'Outra Canção - Ao Vivo',
  '  Aleluia  ',
]) {
  check(`sql key matches foldTitle: ${name}`, sqlNameKey(name), foldTitle(name));
}

check('same folded name', titlesMatch('Deus de Obras Completa', 'deus de obras completa!'), true);
check('shorter title is a different song', titlesMatch('Deus de Obras Completa', 'Deus de Obras'), false);
check('prefix before a dash is a different song', titlesMatch('Deus de Obras - Completa', 'Deus de Obras'), false);

const manualFirst = manual({
  id: 'manual-1',
  title: 'Deus de Obras Completa',
  tom: 'G',
  section: 'principal',
  songId: 'song-completa',
  song: { slug: 'deus-de-obras-completa', title: 'Deus de Obras Completa', artist: 'Igreja' },
});

const sameName = shown(
  [
    culto('domingo_manha', [
      louvor('Deus de Obras Completa', 'A', { ceia: true }),
      louvor('Deus de Obras', 'C'),
    ]),
  ],
  [manualFirst]
);

check(
  'sync does not replace the manual song',
  sameName.items,
  [
    { section: 'principal', title: 'Deus de Obras', tom: 'C', manualId: null },
    { section: 'principal', title: 'Deus de Obras Completa', tom: 'G', manualId: 'manual-1' },
  ]
);
check('both exact names stay blocked for a new insert', sameName.taken, [
  'Deus de Obras',
  'Deus de Obras Completa',
]);

const renamed = shown(
  [culto('domingo_manha', [louvor('Deus de Obras Completa', 'A')])],
  [
    manual({
      id: 'manual-old',
      title: 'Deus de Obras Completa',
      tom: 'D',
      songId: 'song-obras',
    }),
  ]
);
check(
  'sync with the same name keeps the manual tom and does not add a copy',
  renamed.items,
  [{ section: 'principal', title: 'Deus de Obras Completa', tom: 'D', manualId: 'manual-old' }]
);

const distinct = shown(
  [culto('domingo_manha', [louvor('Deus de Obras', 'C')])],
  [manual({ id: 'manual-completa', title: 'Deus de Obras Completa', tom: 'G', songId: 'song-obras' })]
);
check(
  'different names are both listed even when they share a bank song',
  distinct.items,
  [
    { section: 'principal', title: 'Deus de Obras', tom: 'C', manualId: null },
    { section: 'principal', title: 'Deus de Obras Completa', tom: 'G', manualId: 'manual-completa' },
  ]
);

const dashed = shown(
  [culto('domingo_manha', [louvor('Outra Canção - Ao Vivo', 'E')])],
  [manual({ id: 'manual-short', title: 'Outra Canção', tom: 'G' })]
);
check(
  'a dashed variant does not block the shorter name',
  dashed.items,
  [
    { section: 'principal', title: 'Outra Canção - Ao Vivo', tom: 'E', manualId: null },
    { section: 'principal', title: 'Outra Canção', tom: 'G', manualId: 'manual-short' },
  ]
);

const repeatedRemote = shown(
  [
    culto('domingo_manha', [
      louvor('Aleluia', 'A'),
      louvor('aleluia!', 'B', { ceia: true }),
    ]),
  ],
  []
);
check('the first synced copy of a name stays', repeatedRemote.items, [
  { section: 'principal', title: 'Aleluia', tom: 'A', manualId: null },
]);

const repeatedManual = shown(
  [culto('domingo_manha', [])],
  [
    manual({ id: 'first', title: 'Aleluia', tom: 'G', createdAt: '2026-10-02T00:00:00Z', section: 'ofertorio' }),
    manual({ id: 'second', title: 'aleluia', tom: 'C', createdAt: '2026-10-03T00:00:00Z', section: 'ceia' }),
  ]
);
check('the earliest manual copy stays intact', repeatedManual.items, [
  { section: 'ofertorio', title: 'Aleluia', tom: 'G', manualId: 'first' },
]);

const otherCulto = shown(
  [culto('domingo_noite', [louvor('Deus de Obras Completa', 'F')])],
  [manualFirst],
  NOITE
);
check('the same name in another culto is untouched', otherCulto.items, [
  { section: 'principal', title: 'Deus de Obras Completa', tom: 'F', manualId: null },
]);

check('blank source fills', complementText('  ', ' D '), 'D');
check('filled value stays', complementText('G', 'A'), 'G');
check('blank source stays blank', complementText(null, '   '), '');
check('missing source stays blank', complementText(undefined, undefined), '');

const openTom = manual({
  id: 'manual-open',
  title: 'Deus de Obras Completa',
  tom: '   ',
  section: 'principal',
  song: null,
});
const filledKey = shown(
  [culto('domingo_manha', [louvor('Deus de Obras Completa', 'Bb', { ceia: true })])],
  [openTom]
);
check('an empty key is filled and the song stays in its section', filledKey.items, [
  { section: 'principal', title: 'Deus de Obras Completa', tom: 'Bb', manualId: 'manual-open' },
]);

const ministerColumn = buildPlaylistColumns(
  DATE,
  [{ ...culto('domingo_manha', [louvor('Deus de Obras Completa', 'Bb')]), ministrante: '  ' }],
  [openTom],
  buildSongIndex(bank)
).find((column) => column.key === MANHA);
check('a blank minister stays undefined on the card', ministerColumn?.ministrante, 'A definir');

const namedMinister = buildPlaylistColumns(
  DATE,
  [culto('domingo_manha', [louvor('Deus de Obras Completa', 'Bb')])],
  [openTom],
  buildSongIndex(bank)
).find((column) => column.key === MANHA);
check('a synced minister fills the card', namedMinister?.ministrante, 'Ana');

const linked = namedMinister?.sections.flatMap((section) => section.items) ?? [];
check('an unlinked song with the same bank name gains the link and artist', linked, [
  {
    id: 'manual-open',
    title: 'Deus de Obras Completa',
    artist: 'Igreja',
    tom: 'Bb',
    href: '/musica/deus-de-obras-completa',
    manualId: 'manual-open',
    inBank: true,
  },
]);

const keptArtist = manual({
  id: 'manual-artist',
  title: 'Deus de Obras Completa',
  tom: '',
  song: { slug: 'outra', title: 'Deus de Obras Completa', artist: 'Banda Local' },
});
const artistColumn = buildPlaylistColumns(
  DATE,
  [culto('domingo_manha', [louvor('Deus de Obras Completa', 'E')])],
  [keptArtist],
  buildSongIndex(bank)
).find((column) => column.key === MANHA);
check(
  'an existing artist and a filled link stay put while the key is filled',
  artistColumn?.sections.flatMap((section) => section.items),
  [
    {
      id: 'manual-artist',
      title: 'Deus de Obras Completa',
      artist: 'Banda Local',
      tom: 'E',
      href: '/musica/outra',
      manualId: 'manual-artist',
      inBank: true,
    },
  ]
);

check(
  'only a blank key is saved from sync',
  emptyTomFills(
    [openTom, manual({ id: 'has-key', title: 'Deus de Obras Completa', tom: 'G', createdAt: '2026-10-02T00:00:00Z' })],
    [
    culto('domingo_manha', [louvor('Deus de Obras Completa', 'Bb')]),
  ]),
  [{ id: 'manual-open', tom: 'Bb', previous: '   ' }]
);
check(
  'a different name does not donate its key',
  emptyTomFills([manual({ id: 'short', title: 'Deus de Obras', tom: '' })], [
    culto('domingo_manha', [louvor('Deus de Obras Completa', 'Bb')]),
  ]),
  []
);
check(
  'the first synced copy owns the key',
  emptyTomFills([manual({ id: 'blank', title: 'Aleluia', tom: '' })], [
    culto('domingo_manha', [louvor('Aleluia', ' '), louvor('aleluia', 'B')]),
  ]),
  []
);

if (failures > 0) {
  console.error(`\n${failures} failed`);
  process.exit(1);
}
console.log('\nall passed');
