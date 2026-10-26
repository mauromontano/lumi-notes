import { characters, type Shape, type Token } from './shapes';
import type { Slug } from './state';
/**
 * T40: a still portrait of each bot as SVG, from the same shapes Skia draws, for the notification extension (the
 * push shows the bot as its sender). Light theme, idle face, on a soft square the system crops to a circle.
 */
const BACKGROUND = '#eef0fb', MUTED = '#7c8299', TEXT = '#1d2236';
const ORB = ['#9be8ff', '#7c6bff', '#3d2f96'];
const attr = (o: Record<string, string | number | undefined>) => Object.entries(o).filter(([, v]) => v !== undefined).map(([k, v]) => `${k}="${v}"`).join(' ');
function shape(s: Shape, color: (t: Token) => string) {
  switch (s.kind) {
    case 'circle': return s.stroke
      ? `<circle ${attr({ cx: s.cx, cy: s.cy, r: s.r, fill: 'none', stroke: color(s.stroke), 'stroke-width': s.width, 'stroke-dasharray': s.dash?.join(' ') })}/>`
      : `<circle ${attr({ cx: s.cx, cy: s.cy, r: s.r, fill: color(s.fill!) })}/>`;
    case 'rect': return `<rect ${attr({ x: s.x, y: s.y, width: s.w, height: s.h, rx: s.r, fill: color(s.fill), stroke: s.stroke && color(s.stroke), 'stroke-width': s.width })}/>`;
    case 'oval': return `<ellipse ${attr({ cx: s.cx, cy: s.cy, rx: s.rx, ry: s.ry, fill: color(s.fill), opacity: s.opacity })}/>`;
    case 'path': return s.stroke
      ? `<path ${attr({ d: s.d, fill: 'none', stroke: color(s.stroke), 'stroke-width': s.width, 'stroke-linecap': 'round', opacity: s.opacity })}/>`
      : `<path ${attr({ d: s.d, fill: color(s.fill!), opacity: s.opacity, 'fill-rule': s.evenOdd ? 'evenodd' : undefined })}/>`;
  }
}
export function characterSvg(slug: Slug) {
  const c = characters[slug], e = c.eyes;
  const color = (t: Token) => t === 'muted' ? MUTED : c.colors.light[t] ?? TEXT;
  const body = slug === 'lumi'
    ? `<defs><radialGradient id="orb" gradientUnits="userSpaceOnUse" cx="48.8" cy="42" r="62.4"><stop offset="0" stop-color="${ORB[0]}"/><stop offset="0.55" stop-color="${ORB[1]}"/><stop offset="1" stop-color="${ORB[2]}"/></radialGradient></defs><circle cx="60" cy="58" r="40" fill="url(#orb)"/><ellipse cx="45" cy="38" rx="11" ry="6" fill="#ffffff" opacity="0.3" transform="rotate(-32 45 38)"/>`
    : c.body.map(s => shape(s, color)).join('');
  const eye = (x: number, r?: number) => `<rect ${attr({ x: x - e.w / 2, y: e.y - e.h / 2, width: e.w, height: e.h, rx: e.w / 2, fill: color('eye'), transform: r ? `rotate(${r} ${x} ${e.y})` : undefined })}/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 120 120"><rect x="0" y="0" width="120" height="120" fill="${BACKGROUND}"/><g transform="translate(6 6) scale(0.9)">${body}${eye(e.x1, e.r1)}${eye(e.x2, e.r2)}${(c.extra ?? []).map(s => shape(s, color)).join('')}</g></svg>`;
}
