export type Instrumento = 'teclado' | 'violao';

/** Query string / valor inválido vira teclado — o padrão de todos os links antigos. */
export function parseInstrumento(value: string | null | undefined): Instrumento {
  return value === 'violao' ? 'violao' : 'teclado';
}

export type Song = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  lyrics: string;
  chords: string;
  chords_guitar: string;
  base_key: string;
  available_keys: string[];
  capo: number;
  tempo_bpm: number | null;
  time_signature: string | null;
  language: string | null;
  source_url: string | null;
  youtube_url: string | null;
  notes: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

export type KeyOverride = {
  id: string;
  song_id: string;
  key: string;
  chords: string;
  instrumento: Instrumento;
  created_at: string;
  updated_at: string;
};

export type SearchHit = {
  id: string;
  slug: string;
  title: string;
  artist: string;
  base_key: string;
  available_keys: string[];
  has_chords: boolean;
  snippet: string | null;
  updated_at: string;
  rank: number;
};
