// Genera el ícono: el orbe de Lumi con ojos (1024×1024) y lo escribe en los 3 destinos:
// - assets/images/icon.png (app.json / Android-web futuro)
// - assets/expo.icon/Assets/orb.png (fuente Icon Composer versionada)
// - ios/Lumi/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png (bundle que compila Xcode)
// Uso: npm run generate:icon

import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Paleta orbe violeta (tema oscuro de la app)
const BG = '#10132a';
const GLOW = '#7c6bff';
const STOPS = ['#9be8ff', '#7c6bff', '#3d2f96'];


// Cara del personaje Lumi del diseño E16 (orbe r=40 en un viewBox de 120), escalada al orbe del ícono (r=315).
// Pastillas blancas como ojos y un brillo arriba a la izquierda; sin boca, como el resto de los bots.
function face() {
  const k = 315 / 40, at = (dx, dy) => [512 + dx * k, 512 + dy * k];
  const [hx, hy] = at(-15, -20);
  const eye = dx => { const [x, y] = at(dx, 0), w = 10 * k, h = 22 * k; return `<rect x="${x - w / 2}" y="${y - h / 2}" width="${w}" height="${h}" rx="${w / 2}" fill="#ffffff"/>`; };
  return `<ellipse cx="${hx}" cy="${hy}" rx="${11 * k}" ry="${6 * k}" fill="#ffffff" opacity="0.3" transform="rotate(-32 ${hx} ${hy})"/>${eye(-9)}${eye(9)}`;
}

const svg = `
<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <radialGradient id="halo" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0%" stop-color="${GLOW}" stop-opacity="0.4"/>
      <stop offset="70%" stop-color="${GLOW}" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="${GLOW}" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="orb" gradientUnits="userSpaceOnUse" cx="512" cy="425" r="415">
      <stop offset="0%" stop-color="${STOPS[0]}"/>
      <stop offset="55%" stop-color="${STOPS[1]}"/>
      <stop offset="100%" stop-color="${STOPS[2]}"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="${BG}"/>
  <circle cx="512" cy="512" r="512" fill="url(#halo)"/>
  <circle cx="512" cy="512" r="315" fill="url(#orb)"/>
  ${face()}
</svg>`;

const png = await sharp(Buffer.from(svg)).png().toBuffer();

const targets = [
  join(root, 'assets/images/icon.png'),
  join(root, 'assets/expo.icon/Assets/orb.png'),
  join(root, 'ios/Lumi/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png'),
];

for (const t of targets) {
  mkdirSync(dirname(t), { recursive: true });
  await sharp(png).toFile(t);
  console.log('✓', t);
}
