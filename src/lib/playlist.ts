import type { RemoteCulto, RemoteLouvor } from './tom-louvores';

function cultoKey(tipo: string, data: string): string {
  return `${tipo}@${data}`;
}

export const PLAYLIST_MIGRATION_HINT =
  'Para guardar músicas adicionadas à mão, rode de novo o arquivo supabase/migrations/017_playlist_items.sql no SQL Editor do Supabase. Pode executar o arquivo inteiro outra vez.';

export const SECTIONS = [
  { id: 'principal', label: 'Louvor' },
  { id: 'ofertorio', label: 'Ofertório' },
  { id: 'pos', label: 'Pós-palavra' },
  { id: 'ceia', label: 'Ceia' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

const FIXOS = [
  { tipo: 'quarta', title: 'Quarta', subtitle: 'Quarta-feira', weekday: 3 },
  { tipo: 'domingo_manha', title: 'Domingo', subtitle: 'Domingo · Manhã', weekday: 0 },
  { tipo: 'domingo_noite', title: 'Domingo', subtitle: 'Domingo · Noite', weekday: 0 },
] as const;

export type SongRef = {
  id: string;
  slug: string;
  title: string;
  artist: string;
};

export type ManualPlaylistItem = {
  id: string;
  cultoKey: string;
  title: string;
  tom: string;
  section: SectionId;
  songId: string | null;
  song: { slug: string; title: string; artist: string } | null;
};

export type PlaylistEntry = {
  id: string;
  title: string;
  artist: string | null;
  tom: string;
  href: string | null;
  manualId: string | null;
  inBank: boolean;
};

export type PlaylistSectionBlock = {
  id: SectionId;
  label: string;
  showLabel: boolean;
  items: PlaylistEntry[];
};

export type PlaylistColumn = {
  key: string;
  title: string;
  subtitle: string;
  dateLabel: string;
  ministrante: string;
  cancelado: boolean;
  updatedLabel: string | null;
  countLabel: string;
  sections: PlaylistSectionBlock[];
  taken: string[];
};

export function isPlaylistTableMissing(message: string): boolean {
  const text = message.toLowerCase();
  return (
    text.includes('playlist_items') &&
    (text.includes('schema cache') ||
      text.includes('does not exist') ||
      text.includes('could not find') ||
      text.includes('permission denied'))
  );
}

export function titlesMatch(left: string, right: string): boolean {
  const a = foldTitle(left);
  const b = foldTitle(right);
  if (!a || !b) return false;
  if (a === b) return true;
  const head = (value: string) => foldTitle((value.split(/\s[-–—]\s/)[0] ?? value).trim());
  return head(left) === b || head(right) === a;
}

export function foldTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function sectionOf(item: Pick<RemoteLouvor, 'ofertorio' | 'pos' | 'ceia'>): SectionId {
  if (item.ceia) return 'ceia';
  if (item.pos) return 'pos';
  if (item.ofertorio) return 'ofertorio';
  return 'principal';
}

export function parseSection(value: string | null | undefined): SectionId {
  return SECTIONS.some((section) => section.id === value) ? (value as SectionId) : 'principal';
}

export function weekdayOf(iso: string): number {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

export function shiftIsoDate(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

/** Próximo domingo ou quarta, no calendário de São Paulo. No próprio dia, fica nele. */
export function defaultServiceDate(now = new Date()): string {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
  if (weekdayOf(today) === 0 || weekdayOf(today) === 3) return today;
  let cursor = today;
  for (let step = 0; step < 6; step += 1) {
    cursor = shiftIsoDate(cursor, 1);
    const weekday = weekdayOf(cursor);
    if (weekday === 0 || weekday === 3) return cursor;
  }
  return today;
}

export function formatPlaylistDate(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 15));
  const label = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date);
  return label.charAt(0).toLocaleUpperCase('pt-BR') + label.slice(1);
}

export function shortDate(iso: string): string {
  const [, month, day] = iso.split('-');
  return `${day}/${month}`;
}

export function louvorCount(count: number): string {
  if (count === 1) return '1 louvor';
  return `${count} louvores`;
}

export function formatUpdated(iso: string | null, now = Date.now()): string | null {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return null;
  const minutes = Math.round((now - then) / 60000);
  if (minutes < 1) return 'Atualizado agora';
  if (minutes < 60) return `Atualizado há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return hours === 1 ? 'Atualizado há 1 hora' : `Atualizado há ${hours} horas`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Atualizado há 1 dia' : `Atualizado há ${days} dias`;
}

export function buildSongIndex(songs: SongRef[]): Map<string, SongRef[]> {
  const index = new Map<string, SongRef[]>();
  for (const song of songs) {
    const key = foldTitle(song.title);
    if (!key) continue;
    const bucket = index.get(key);
    if (bucket) bucket.push(song);
    else index.set(key, [song]);
  }
  return index;
}

function chooseSong(list: SongRef[] | undefined, remoteName: string): SongRef | null {
  if (!list?.length) return null;
  if (list.length === 1) return list[0];
  const folded = foldTitle(remoteName);
  return list.find((song) => song.artist && folded.includes(foldTitle(song.artist))) ?? list[0];
}

export function matchSong(name: string, index: Map<string, SongRef[]>): SongRef | null {
  const direct = chooseSong(index.get(foldTitle(name)), name);
  if (direct) return direct;
  const head = name.split(/\s[-–—]\s/)[0]?.trim() ?? '';
  if (!head || foldTitle(head) === foldTitle(name)) return null;
  return chooseSong(index.get(foldTitle(head)), name);
}

function namesOf(item: ManualPlaylistItem): string[] {
  return [item.title, item.song?.title ?? ''].map((name) => name.trim()).filter(Boolean);
}

/** A mesma música, esteja ela no Tom Louvores ou numa inclusão manual. */
export function dedupeManualItems(
  items: ManualPlaylistItem[],
  louvores: RemoteLouvor[],
  songs: Map<string, SongRef[]>
): ManualPlaylistItem[] {
  const claimedNames = louvores.map((item) => item.nome);
  const claimedIds = new Set<string>();
  for (const item of louvores) {
    const match = matchSong(item.nome, songs);
    if (match) claimedIds.add(match.id);
  }

  const kept: ManualPlaylistItem[] = [];
  for (const item of items) {
    const names = namesOf(item);
    const sameName = names.some((name) => claimedNames.some((other) => titlesMatch(name, other)));
    const sameSong = Boolean(item.songId && claimedIds.has(item.songId));
    if (sameName || sameSong) continue;
    kept.push(item);
    claimedNames.push(...names);
    if (item.songId) claimedIds.add(item.songId);
  }
  return kept;
}

export function redundantManualIds(
  items: ManualPlaylistItem[],
  cultos: Pick<RemoteCulto, 'tipo' | 'data' | 'louvores'>[],
  songs: Map<string, SongRef[]>
): string[] {
  const louvoresOf = new Map(cultos.map((culto) => [`${culto.tipo}@${culto.data}`, culto.louvores]));
  const byKey = new Map<string, ManualPlaylistItem[]>();
  for (const item of items) {
    const group = byKey.get(item.cultoKey) ?? [];
    group.push(item);
    byKey.set(item.cultoKey, group);
  }

  const ids: string[] = [];
  for (const [key, group] of byKey) {
    const kept = new Set(dedupeManualItems(group, louvoresOf.get(key) ?? [], songs).map((item) => item.id));
    for (const item of group) {
      if (!kept.has(item.id)) ids.push(item.id);
    }
  }
  return ids;
}

function artistOf(value: string | null | undefined): string | null {
  const artist = (value ?? '').trim();
  return artist || null;
}

function remoteEntry(columnKey: string, item: RemoteLouvor, index: number, songs: Map<string, SongRef[]>): PlaylistEntry {
  const match = matchSong(item.nome, songs);
  return {
    id: `${columnKey}:r:${index}`,
    title: match?.title ?? item.nome,
    artist: artistOf(match?.artist),
    tom: item.tom,
    href: match ? `/musica/${match.slug}` : null,
    manualId: null,
    inBank: Boolean(match),
  };
}

function manualEntry(item: ManualPlaylistItem): PlaylistEntry {
  return {
    id: item.id,
    title: item.song?.title || item.title,
    artist: artistOf(item.song?.artist),
    tom: item.tom,
    href: item.song ? `/musica/${item.song.slug}` : null,
    manualId: item.id,
    inBank: Boolean(item.song),
  };
}

function columnFrom(input: {
  key: string;
  title: string;
  subtitle: string;
  date: string;
  culto: RemoteCulto | null;
  manual: ManualPlaylistItem[];
  songs: Map<string, SongRef[]>;
  now: number;
}): PlaylistColumn {
  const manual = dedupeManualItems(input.manual, input.culto?.louvores ?? [], input.songs);
  const sections: PlaylistSectionBlock[] = SECTIONS.map((section) => {
    const remote = (input.culto?.louvores ?? []).flatMap((item, index) =>
      sectionOf(item) === section.id ? [remoteEntry(input.key, item, index, input.songs)] : []
    );
    const added = manual.filter((item) => item.section === section.id).map(manualEntry);
    return { id: section.id, label: section.label, showLabel: false, items: [...remote, ...added] };
  }).filter((section) => section.items.length > 0);

  const showAllLabels = sections.length > 1;
  for (const section of sections) {
    section.showLabel = showAllLabels || section.id !== 'principal';
  }

  const total = sections.reduce((sum, section) => sum + section.items.length, 0);
  const taken: string[] = [];
  const claim = (name: string) => {
    const value = name.trim();
    if (!value || taken.some((other) => titlesMatch(other, value))) return;
    taken.push(value);
  };
  for (const item of input.culto?.louvores ?? []) claim(item.nome);
  for (const item of manual) {
    for (const name of namesOf(item)) claim(name);
  }
  for (const section of sections) {
    for (const item of section.items) claim(item.title);
  }

  return {
    key: input.key,
    title: input.title,
    subtitle: input.subtitle,
    dateLabel: shortDate(input.date),
    ministrante: input.culto?.ministrante.trim() || 'A definir',
    cancelado: Boolean(input.culto?.cancelado),
    updatedLabel: formatUpdated(input.culto?.atualizadoEm ?? null, input.now),
    countLabel: louvorCount(total),
    sections,
    taken,
  };
}

export function buildPlaylistColumns(
  date: string,
  cultos: RemoteCulto[],
  manual: ManualPlaylistItem[],
  songs: Map<string, SongRef[]>,
  now = Date.now()
): PlaylistColumn[] {
  const weekday = weekdayOf(date);
  const columns: PlaylistColumn[] = [];

  for (const fixo of FIXOS) {
    if (fixo.weekday !== weekday) continue;
    const key = cultoKey(fixo.tipo, date);
    columns.push(
      columnFrom({
        key,
        title: fixo.title,
        subtitle: fixo.subtitle,
        date,
        culto: cultos.find((culto) => culto.tipo === fixo.tipo && culto.data === date) ?? null,
        manual: manual.filter((item) => item.cultoKey === key),
        songs,
        now,
      })
    );
  }

  for (const culto of cultos) {
    if (culto.data !== date || FIXOS.some((fixo) => fixo.tipo === culto.tipo)) continue;
    const key = cultoKey(culto.tipo, culto.data);
    columns.push(
      columnFrom({
        key,
        title: culto.nome || 'Culto extra',
        subtitle: 'Culto extra',
        date,
        culto,
        manual: manual.filter((item) => item.cultoKey === key),
        songs,
        now,
      })
    );
  }

  return columns;
}
