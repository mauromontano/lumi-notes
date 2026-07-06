// Genera el ícono orb (1024×1024) y lo escribe en los 3 destinos:
// - assets/images/icon.png (app.json / Android-web futuro)
// - assets/expo.icon/Assets/orb.png (fuente Icon Composer versionada)
// - ios/LumiNotes/expo.icon/Assets/orb.png (bundle que compila Xcode)
// Uso: npm run generate:icon

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Paleta orbe violeta (tema oscuro de la app)
const BG = '#0b0e1d';
const GLOW = '#7c6bff';
const STOPS = ['#9be8ff', '#7c6bff', '#3d2f96'];

const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${GLOW}" stop-opacity="0.4"/>
      <stop offset="70%" stop-color="${GLOW}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${GLOW}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb" gradientUnits="userSpaceOnUse" cx="512" cy="410" r="486">
      <stop offset="0%" stop-color="${STOPS[0]}"/>
      <stop offset="55%" stop-color="${STOPS[1]}"/>
      <stop offset="100%" stop-color="${STOPS[2]}"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="${BG}"/>
  <circle cx="512" cy="512" r="512" fill="url(#halo)"/>
  <circle cx="512" cy="512" r="369" fill="url(#orb)"/>
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();

const targets = [
  join(root, 'assets/images/icon.png'),
  join(root, 'assets/expo.icon/Assets/orb.png'),
  join(root, 'ios/LumiNotes/expo.icon/Assets/orb.png'),
];

for (const t of targets) {
  mkdirSync(dirname(t), { recursive: true });
  await sharp(png).toFile(t);
  console.log('✓', t);
}
