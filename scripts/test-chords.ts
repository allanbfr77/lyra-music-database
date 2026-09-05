/**
 * Testes do motor de cifras.  Rode com:  npm run test:chords
 */
import {
  allKeysFor,
  availableInstruments,
  chartForKey,
  chartToLyrics,
  cifraPath,
  detectKey,
  detectSongKey,
  extractChordSequence,
  keyDisplayName,
  keyToSlug,
  parseChart,
  parseChord,
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

console.log('\nNomes de tom');
check('Am em português', keyDisplayName('Am'), 'Am (Lá menor)');
check('F# em português', keyDisplayName('F#'), 'F# (Fá sustenido maior)');
check('Bb em português', keyDisplayName('Bb'), 'Bb (Si bemol maior)');

console.log('\nParser de acorde (fundamental nas inversões)');
check('Am7 fundamental', parseChord('Am7')?.root, 'A');
check('F9/C usa F, não C', parseChord('F9/C')?.root, 'F');
check('G11/B usa G, não B', parseChord('G11/B')?.root, 'G');
check('C/E usa C, não E', parseChord('C/E')?.root, 'C');
check('Dm7 fundamental', parseChord('Dm7')?.root, 'D');

console.log('\nDetecção de tom');
const userExample = 'Am7  F9/C  C  G11/B  Dm7';
const userGuess = detectKey(userExample);
check('exemplo do usuário → Am', userGuess?.key, 'Am');
check('exemplo do usuário não é C', userGuess?.key !== 'C', true);

const formatted = [
  '[Intro] Am7  F9/C  C  G11/B',
  '',
  'Am7           F9/C         C',
  'Tu és o Deus de toda a terra',
  '        G11/B        Dm7',
  'Em teu nome eu vou vencer',
].join('\n');
check('cifra formatada → Am', detectKey(formatted)?.key, 'Am');
check(
  'análise não altera a cifra',
  formatted,
  [
    '[Intro] Am7  F9/C  C  G11/B',
    '',
    'Am7           F9/C         C',
    'Tu és o Deus de toda a terra',
    '        G11/B        Dm7',
    'Em teu nome eu vou vencer',
  ].join('\n')
);

check('I–V–vi–IV em C', detectKey('C  G  Am  F')?.key, 'C');
check('G D Em C → G', detectKey('G  D  Em  C')?.key, 'G');
check('Em C G D → Em', detectKey('Em  C  G  D')?.key, 'Em');
check('Am F C E7 → Am (dominante menor)', detectKey('Am  F  C  E7')?.key, 'Am');
check('C G Am F C → C (resolve no I)', detectKey('C  G  Am  F  C')?.key, 'C');
check('começa em Am mas resolve em C', detectKey('Am  F  C  G  C')?.key, 'C');
check('G C D G → G (não só o primeiro acorde)', detectKey('G  C  D  G')?.key, 'G');
check('lista com vírgulas', detectKey('Am7, F9/C, C, G11/B, Dm7')?.key, 'Am');
check('cifra vazia', detectKey(''), null);
check(
  'teclado vazio usa violão',
  detectSongKey('', 'Em  C  G  D')?.key,
  'Em'
);
check(
  'sequência ignora letra',
  extractChordSequence(formatted).map((c) => c.root),
  ['A', 'F', 'C', 'G', 'A', 'F', 'C', 'G', 'D']
);

console.log(failures === 0 ? '\n✅ Todos os testes passaram.\n' : `\n❌ ${failures} teste(s) falharam.\n`);
process.exit(failures === 0 ? 0 : 1);
