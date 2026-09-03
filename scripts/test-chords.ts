/**
 * Testes do motor de cifras.  Rode com:  npm run test:chords
 */
import {
  allKeysFor,
  availableInstruments,
  chartForKey,
  chartToLyrics,
  cifraPath,
  keyToSlug,
  parseChart,
  slugToKey,
  transposeChart,
  uniqueChords,
} from '../src/lib/chords.ts';

let failures = 0;

function check(name: string, actual: unknown, expected: unknown) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok   ${name}`);
  } else {
    failures++;
    console.log(`  FAIL ${name}\n       esperado: ${e}\n       obtido:   ${a}`);
  }
}

console.log('\nTons e slugs');
check('A → a', keyToSlug('A'), 'a');
check('C# vira Db (grafia única) → db', keyToSlug('C#'), 'db');
check('Bb → bb', keyToSlug('Bb'), 'bb');
check('F#m → fsm', keyToSlug('F#m'), 'fsm');
check('a → A', slugToKey('a'), 'A');
check('cs → Db', slugToKey('cs'), 'Db');
check('gb → F# (grafia única)', slugToKey('gb'), 'F#');
check('bb → Bb', slugToKey('bb'), 'Bb');
check('fsm → F#m', slugToKey('fsm'), 'F#m');
check('slug inválido', slugToKey('h'), null);
check('12 tons a partir de G', allKeysFor('G'), ['G', 'Ab', 'A', 'Bb', 'B', 'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#']);
check('12 tons a partir de Am', allKeysFor('Am'), ['Am', 'Bbm', 'Bm', 'Cm', 'C#m', 'Dm', 'Ebm', 'Em', 'Fm', 'F#m', 'Gm', 'G#m']);

console.log('\nClassificação de linhas');
const chart = [
  '[Intro] G  D  Em  C',
  '',
  'G            D/F#      Em',
  'Tu és o Deus de toda a terra',
  '        C          G',
  'Em teu nome eu vou vencer',
].join('\n');

const parsed = parseChart(chart);
check('tipos das linhas', parsed.map((l) => l.type), ['chords', 'blank', 'chords', 'lyric', 'chords', 'lyric']);
check('"Em teu nome…" é letra', parsed[5].type, 'lyric');

console.log('\nTransposição');
check(
  'G → A preserva alinhamento',
  transposeChart('G            D/F#      Em\nTu és o Deus de toda a terra', 'G', 'A'),
  'A            E/G#      F#m\nTu és o Deus de toda a terra'
);
check('G → Bb usa bemóis', transposeChart('G  Em  C  D', 'G', 'Bb'), 'Bb Gm  Eb F');
check('C → D com tétrades', transposeChart('Cmaj7  Am7  F#dim  G7/B', 'C', 'D'), 'Dmaj7  Bm7  G#dim  A7/C#');
check('mesmo tom não muda nada', transposeChart('G  D/F#  Em', 'G', 'G'), 'G  D/F#  Em');
check('letra intacta', transposeChart(chart, 'G', 'A').split('\n')[3], 'Tu és o Deus de toda a terra');
check('seção transposta', transposeChart(chart, 'G', 'A').split('\n')[0], '[Intro] A  E  F#m D');

console.log('\nExtras');
check('acordes usados', uniqueChords(chart), ['G', 'D', 'Em', 'C', 'D/F#']);
check(
  'letra extraída da cifra',
  chartToLyrics(chart),
  'Tu és o Deus de toda a terra\nEm teu nome eu vou vencer'
);

console.log('\nInstrumentos');
const song = { chords: 'G  D', chords_guitar: 'C  G', base_key: 'G' };
check('URL de teclado sem sufixo', cifraPath('galileu', 'A'), '/musica/galileu/cifra/a');
check('URL de violão com sufixo', cifraPath('galileu', 'A', 'violao'), '/musica/galileu/cifra/a/violao');
check(
  'chartForKey teclado ignora override de violão',
  chartForKey(song, [{ key: 'A', chords: 'A  E  (violao)', instrumento: 'violao' }], 'A').chart,
  'A  E'
);
check(
  'chartForKey violão usa cifra de guitarra',
  chartForKey(song, [], 'A', 'violao').chart,
  'D  A'
);
check(
  'instrumentos disponíveis',
  availableInstruments(song, []),
  ['teclado', 'violao']
);
check(
  'sem cifra de violão não lista violão',
  availableInstruments({ chords: 'G', chords_guitar: '' }, []),
  ['teclado']
);

console.log(failures === 0 ? '\n✅ Todos os testes passaram.\n' : `\n❌ ${failures} teste(s) falharam.\n`);
process.exit(failures === 0 ? 0 : 1);
