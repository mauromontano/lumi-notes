// Genera el retrato de cada bot (PNG 256×256) para la extensión de notificaciones: el push muestra al bot como
// remitente (T40). Sale de las mismas formas que dibuja Skia. Uso: npm run generate:characters
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { characters } from '../src/characters/shapes';
import { characterSvg } from '../src/characters/svg';
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'targets', 'notification-service', 'characters');
mkdirSync(out, { recursive: true });
for (const slug of Object.keys(characters) as (keyof typeof characters)[]) {
  await sharp(Buffer.from(characterSvg(slug))).png().toFile(join(out, `${slug}.png`));
  console.log(`characters/${slug}.png`);
}
