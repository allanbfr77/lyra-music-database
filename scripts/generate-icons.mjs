import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const dir = join(process.cwd(), 'public/icons');

function cleanSvg(filename) {
  let svg = readFileSync(join(dir, filename), 'utf8');
  svg = svg.replace(/<metadata>[\s\S]*?<\/metadata>/g, '');
  svg = svg.replace(/\s+xmlns:c2pa="[^"]*"/g, '');
  writeFileSync(join(dir, filename), svg);
  return svg;
}

const favDark = cleanSvg('lyra-db-favicon-dark.svg');
const favLight = cleanSvg('lyra-db-favicon-light.svg');
const iconDark = cleanSvg('lyra-db-icon-dark.svg');
const iconLight = cleanSvg('lyra-db-icon-light.svg');

async function png(svg, out, size) {
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(join(dir, out));
  console.log('wrote', out, size);
}

// Sem "Lyra.db": header, favicon, PWA, apple
await png(favDark, 'icon-64.png', 64);
await png(favDark, 'icon-192.png', 192);
await png(favDark, 'icon-512.png', 512);
await png(favDark, 'maskable-512.png', 512);
await png(favDark, 'apple-touch-icon.png', 180);
await png(favLight, 'icon-64-light.png', 64);
await png(favLight, 'icon-192-light.png', 192);
await png(favLight, 'icon-512-light.png', 512);
await png(favDark, 'favicon-32.png', 32);
await png(favLight, 'favicon-32-light.png', 32);

// Lockup com "Lyra.db" para cenários em que a marca aparece sozinha
await png(iconDark, 'lyra-db-lockup-512.png', 512);
await png(iconLight, 'lyra-db-lockup-512-light.png', 512);

console.log('done');
