'use client';

import { useMemo } from 'react';
import { parseChart, type ChartLine } from '@/lib/chords';
import { useReaderSettings } from '@/components/SongControlPanel';

type Props = {
  mode: 'chords' | 'lyrics';
  text: string;
};

export default function Reader({ mode, text }: Props) {
  const { sizePx, wrap } = useReaderSettings();
  const lines = useMemo<ChartLine[]>(() => (mode === 'chords' ? parseChart(text) : []), [mode, text]);

  if (mode === 'chords') {
    return (
      <div className={`sheet${wrap ? ' sheet--wrap' : ''}`} style={{ ['--sheet-size' as string]: `${sizePx}px` }}>
        {lines.map((line, i) => (
          <SheetLine key={i} line={line} />
        ))}
      </div>
    );
  }

  return (
    <div className="lyrics" style={{ ['--sheet-size' as string]: `${sizePx}px` }}>
      {text}
    </div>
  );
}

function SheetLine({ line }: { line: ChartLine }) {
  if (line.type === 'blank') return <div className="sheet__line">{' '}</div>;
  if (line.type === 'section') {
    const label = line.text.replace(/^\[|\]$/g, '').trim() || line.text;
    return (
      <div className="sheet__line sheet__section">
        <span className="sheet__section-chip">{label}</span>
      </div>
    );
  }
  if (line.type === 'lyric') return <div className="sheet__line">{line.text}</div>;

  const parts: React.ReactNode[] = [];
  let col = 0;
  line.tokens.forEach((token, i) => {
    if (token.col > col) parts.push(line.text.slice(col, token.col));
    parts.push(
      token.isChord ? (
        <span key={i} className="sheet__chord">
          {token.text}
        </span>
      ) : (
        token.text
      )
    );
    col = token.col + token.text.length;
  });
  parts.push(line.text.slice(col));

  return <div className="sheet__line">{parts}</div>;
}
