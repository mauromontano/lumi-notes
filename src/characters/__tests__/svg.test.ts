import { characterSvg } from '../svg';
import { characters } from '../shapes';
test('every bot has a still portrait for the push: its body and pill eyes on a soft background', () => {
  for (const slug of Object.keys(characters) as (keyof typeof characters)[]) {
    const svg = characterSvg(slug);
    expect(svg.startsWith('<svg ')).toBe(true);
    expect(svg).toContain('viewBox="0 0 120 120"');
    expect((svg.match(/<rect /g) ?? []).length).toBeGreaterThanOrEqual(3);
  }
  expect(characterSvg('finanzas')).toContain('#f2b134');
  expect(characterSvg('playio')).toContain('#d6ec4f');
  expect(characterSvg('lumi')).toContain('radialGradient');
});
