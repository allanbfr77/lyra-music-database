import sharp from 'sharp';
import { join } from 'path';

/**
 * Regenera tamanhos menores a partir dos mestres 512 (dark/light).
 * Rode: node scripts/generate-icons.mjs
 */
const dir = join(process.cwd(), 'public/icons');
const darkSrc = join(dir, 'icon-512.png');
const lightSrc = join(dir, 'icon-512-light.png');

async function resize(src, out, size) {
  await sharp(src).resize(size, size).png().toFile(join(dir, out));
  console.log('wrote', out, size);
}

await resize(darkSrc, 'favicon-32.png', 32);
await resize(lightSrc, 'favicon-32-light.png', 32);
await resize(darkSrc, 'icon-64.png', 64);
await resize(lightSrc, 'icon-64-light.png', 64);
await resize(darkSrc, 'icon-192.png', 192);
await resize(lightSrc, 'icon-192-light.png', 192);
await resize(darkSrc, 'apple-touch-icon.png', 180);
await resize(darkSrc, 'lyra-db-favicon-dark.png', 128);
await resize(lightSrc, 'lyra-db-favicon-light.png', 128);

console.log('done');
