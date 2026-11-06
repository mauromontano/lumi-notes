import { bodyTransform, ballTransform, eyesTransform } from '../motion';
import { characters } from '../shapes';
type Fn = ((...a: never[]) => unknown) & { __workletHash?: number; __closure?: Record<string, unknown> };
// Reanimated runs these on the UI thread: a plain JS function there throws, and a release build aborts on open.
const onlyWorklets = (f: Fn) => {
  expect(f.__workletHash).toBeDefined();
  for (const v of Object.values(f.__closure ?? {})) if (typeof v === 'function') onlyWorklets(v as Fn);
};
test('las transformaciones de los personajes son worklets que no llaman funciones de JS', () => {
  [bodyTransform, ballTransform, eyesTransform].forEach(f => onlyWorklets(f as Fn));
});
test('cada gesto mueve el cuerpo como el diseño', () => {
  expect(bodyTransform('sway', 0.25)).toEqual([{ rotate: (6 * Math.PI) / 180 }]);
  expect(bodyTransform('nod', 0.25)).toEqual([{ rotate: (4 * Math.PI) / 180 }]);
  expect(bodyTransform('float', 0.25)[0]).toEqual({ translateY: -3 });
  expect((bodyTransform('hop', 0.5)[0] as { translateY: number }).translateY).toBeCloseTo(-7);
  expect(bodyTransform('read', 0.3)).toEqual([{ translateY: 0 }]);
  expect(ballTransform('bounceBall', 0.5)[0].translateY).toBeCloseTo(-10);
  expect(ballTransform('float', 0.5)).toEqual([{ translateY: 0 }]);
  expect(eyesTransform('read', 0.25, 0.4)).toEqual([{ translateX: 3 }, { scaleY: 0.4 }]);
  for (const c of Object.values(characters)) expect(() => bodyTransform(c.gesture, 0.7)).not.toThrow();
});
