import type { Gesture } from './shapes';
// These run on the UI thread inside useDerivedValue, so every helper they call must be a worklet too:
// a plain JS function there throws and a release build aborts when the chat list appears.
function deg(d: number) {
  'worklet';
  return (d * Math.PI) / 180;
}
export function bodyTransform(gesture: Gesture, t: number) {
  'worklet';
  const a = 2 * Math.PI * t, half = Math.abs(Math.sin(a / 2));
  switch (gesture) {
    case 'float': return [{ translateY: -3 * Math.sin(a) }];
    case 'spin': return [{ scaleX: 0.6 + 0.4 * Math.abs(Math.cos(a / 2)) }];
    case 'reps': return [{ translateY: -5 * half }];
    case 'sway': return [{ rotate: deg(6) * Math.sin(a) }];
    case 'hop': return [{ translateY: -7 * half }];
    case 'nod': return [{ rotate: deg(4) * Math.sin(a) }];
    default: return [{ translateY: 0 }];
  }
}
export function ballTransform(gesture: Gesture, t: number) {
  'worklet';
  return [{ translateY: gesture === 'bounceBall' ? -10 * Math.abs(Math.sin(Math.PI * t)) : 0 }];
}
export function eyesTransform(gesture: Gesture, t: number, blink: number) {
  'worklet';
  return [{ translateX: gesture === 'read' ? 3 * Math.sin(2 * Math.PI * t) : 0 }, { scaleY: blink }];
}
