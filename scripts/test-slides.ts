/**
 * Testes da divisão da letra em slides.  Rode com:  npm run test:slides
 */
import { hasSavedSlides, lyricsToSlides, resolveSlideBlocks, slidesPath } from '../src/lib/slides.ts';

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

console.log('\nSlides a partir da letra');
check(
  'dois blocos separados por linha em branco',
  lyricsToSlides(
    'Abra os olhos do meu coração\nAbra os olhos do meu coração\nQuero Te ver, quero Te ver //(2X)\n\nExaltado e bem alto\nBrilhando a luz da Tua glória\nDerrame Seu amor e poder\nPois Tu és Santo //(2X)'
  ),
  [
    'Abra os olhos do meu coração\nAbra os olhos do meu coração\nQuero Te ver, quero Te ver //(2X)',
    'Exaltado e bem alto\nBrilhando a luz da Tua glória\nDerrame Seu amor e poder\nPois Tu és Santo //(2X)',
  ]
);
check('várias linhas em branco contam como um só corte', lyricsToSlides('A\n\n\nB'), ['A', 'B']);
check('quebra Windows', lyricsToSlides('A\r\n\r\nB'), ['A', 'B']);
check('espaços numa linha vazia ainda separam', lyricsToSlides('A\n  \nB'), ['A', 'B']);
check('letra vazia', lyricsToSlides('   \n\n  '), []);
check('um único bloco', lyricsToSlides('só um verso\noutra linha'), ['só um verso\noutra linha']);
check('caminho da aba', slidesPath('galileu'), '/musica/galileu/slides');

console.log('\nSlides salvos são independentes da letra');
check('sem versão pessoal usa a letra só como semente', resolveSlideBlocks(null, 'A\n\nB'), ['A', 'B']);
check('versão pessoal prevalece sobre a letra', resolveSlideBlocks(['X', 'Y'], 'A\n\nB'), ['X', 'Y']);
check('array vazio ainda é versão pessoal', resolveSlideBlocks([], 'A\n\nB'), []);
check('null não conta como salvo', hasSavedSlides(null), false);
check('array (mesmo vazio) conta como salvo', hasSavedSlides([]), true);

if (failures) {
  console.log(`\n${failures} teste(s) falharam.\n`);
  process.exit(1);
}
console.log('\nTodos os testes de slides passaram.\n');
