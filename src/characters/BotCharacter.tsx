import React, { useEffect } from 'react';
import { BlurMask, Canvas, Circle, DashPathEffect, Group, Oval, Path, RadialGradient, RoundedRect, vec } from '@shopify/react-native-skia';
import { cancelAnimation, Easing, useDerivedValue, useReducedMotion, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeContext';
import { characters, type EyeSpec, type Shape, type Token } from './shapes';
import { faceFor, motionFor, type CharacterState, type Eyes, type Mark, type Slug } from './state';
type Props = { slug: Slug; state: CharacterState; size: number; place: 'list' | 'chat' };
const deg = (d: number) => (d * Math.PI) / 180;
/**
 * A bot drawn with Skia from the approved design (120×120 viewBox) and animated with Reanimated: each bot has its
 * own gesture, and all of them blink. In the list only a working or waiting bot moves; Reduce Motion keeps them still.
 */
export function BotCharacter({ slug, state, size, place }: Props) {
  const { palette, theme } = useTheme();
  const reduceMotion = useReducedMotion();
  const c = characters[slug], motion = motionFor({ place, state, reduceMotion }), face = faceFor(state);
  const color = (t: Token) => t === 'muted' ? palette.textMuted : (theme === 'dark' ? c.colors.dark?.[t] : undefined) ?? c.colors.light[t] ?? palette.text;
  const t = useSharedValue(0), blink = useSharedValue(1);
  useEffect(() => {
    cancelAnimation(t); cancelAnimation(blink); t.value = 0; blink.value = 1;
    if (motion === 'full' && state !== 'sleep') t.value = withRepeat(withTiming(1, { duration: state === 'think' ? 1200 : 2400, easing: Easing.linear }), -1, false);
    // A per-bot offset so a list of bots does not blink in sync.
    if (motion !== 'none' && face.eyes === 'pill') blink.value = withRepeat(withSequence(withDelay(4600 + slug.length * 170, withTiming(0.1, { duration: 80 })), withTiming(1, { duration: 120 })), -1, false);
  }, [motion, state, slug, face.eyes, t, blink]);
  const gesture = c.gesture;
  const body = useDerivedValue(() => {
    const a = 2 * Math.PI * t.value, half = Math.abs(Math.sin(a / 2));
    switch (gesture) {
      case 'float': return [{ translateY: -3 * Math.sin(a) }];
      case 'spin': return [{ scaleX: 0.6 + 0.4 * Math.abs(Math.cos(a / 2)) }];
      case 'reps': return [{ translateY: -5 * half }];
      case 'sway': return [{ rotate: deg(6) * Math.sin(a) }];
      case 'hop': return [{ translateY: -7 * half }];
      case 'nod': return [{ rotate: deg(4) * Math.sin(a) }];
      default: return [{ translateY: 0 }];
    }
  });
  const ball = useDerivedValue(() => [{ translateY: gesture === 'bounceBall' ? -10 * Math.abs(Math.sin(Math.PI * t.value)) : 0 }]);
  const eyes = useDerivedValue(() => [{ translateX: gesture === 'read' ? 3 * Math.sin(2 * Math.PI * t.value) : 0 }, { scaleY: blink.value }]);
  const eyeColor = color('eye'), e = c.eyes;
  return <Canvas style={{ width: size, height: size }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <Group transform={[{ scale: size / 120 }]}>
      {c.shadow && <Oval x={36} y={111} width={48} height={8} color={palette.text} opacity={0.1} />}
      <Group transform={body} origin={vec(...c.pivot)}>
        {slug === 'lumi' ? <LumiBody colors={palette.orb.colors} /> : c.body.map((s, i) => <ShapeView key={i} s={s} color={color} />)}
        <Group transform={eyes} origin={vec((e.x1 + e.x2) / 2, e.y)}><Face eyes={face.eyes} spec={e} color={eyeColor} /></Group>
      </Group>
      {c.extra && <Group transform={ball}>{c.extra.map((s, i) => <ShapeView key={i} s={s} color={color} />)}</Group>}
      <MarkView mark={face.mark} muted={palette.textMuted} accent={palette.accent} danger={palette.danger} />
    </Group>
  </Canvas>;
}
function LumiBody({ colors }: { colors: [string, string, string] }) {
  // Same orb as LumiOrb: gradient body with a soft glow and a highlight, as in the design.
  const gradient = <RadialGradient c={vec(48.8, 42)} r={62.4} colors={colors} />;
  return <>
    <Circle cx={60} cy={58} r={38} opacity={0.6}>{gradient}<BlurMask blur={9} style="normal" /></Circle>
    <Circle cx={60} cy={58} r={40}>{gradient}</Circle>
    <Group transform={[{ rotate: deg(-32) }]} origin={vec(45, 38)}><Oval x={34} y={32} width={22} height={12} color="#ffffff" opacity={0.3} /></Group>
  </>;
}
function ShapeView({ s, color }: { s: Shape; color: (t: Token) => string }) {
  switch (s.kind) {
    case 'circle': return s.stroke
      ? <Circle cx={s.cx} cy={s.cy} r={s.r} color={color(s.stroke)} style="stroke" strokeWidth={s.width}>{s.dash && <DashPathEffect intervals={s.dash} />}</Circle>
      : <Circle cx={s.cx} cy={s.cy} r={s.r} color={color(s.fill!)} />;
    case 'rect': return <>
      <RoundedRect x={s.x} y={s.y} width={s.w} height={s.h} r={s.r} color={color(s.fill)} />
      {s.stroke && <RoundedRect x={s.x} y={s.y} width={s.w} height={s.h} r={s.r} color={color(s.stroke)} style="stroke" strokeWidth={s.width} />}
    </>;
    case 'oval': return <Oval x={s.cx - s.rx} y={s.cy - s.ry} width={s.rx * 2} height={s.ry * 2} color={color(s.fill)} opacity={s.opacity} />;
    case 'path': return s.stroke
      ? <Path path={s.d} color={color(s.stroke)} style="stroke" strokeWidth={s.width} strokeCap="round" opacity={s.opacity} />
      : <Path path={s.d} color={color(s.fill!)} opacity={s.opacity} fillType={s.evenOdd ? 'evenOdd' : 'winding'} />;
  }
}
function Face({ eyes, spec: e, color }: { eyes: Eyes; spec: EyeSpec; color: string }) {
  const stroke = e.w * 0.72;
  return <>{[[e.x1, e.r1], [e.x2, e.r2]].map(([x, r], i) => {
    const cx = x!;
    switch (eyes) {
      case 'pill': return <Group key={i} transform={[{ rotate: deg(r ?? 0) }]} origin={vec(cx, e.y)}><RoundedRect x={cx - e.w / 2} y={e.y - e.h / 2} width={e.w} height={e.h} r={e.w / 2} color={color} /></Group>;
      case 'happy': return <Path key={i} path={`M${cx - e.w * 0.8} ${e.y + 3}Q${cx} ${e.y - e.h * 0.5} ${cx + e.w * 0.8} ${e.y + 3}`} color={color} style="stroke" strokeWidth={stroke} strokeCap="round" />;
      case 'closed': return <Path key={i} path={`M${cx - e.w * 0.8} ${e.y + 3}H${cx + e.w * 0.8}`} color={color} style="stroke" strokeWidth={stroke} strokeCap="round" />;
      case 'dots': return <Circle key={i} cx={cx} cy={e.y} r={e.w * 0.42} color={color} />;
    }
  })}</>;
}
function MarkView({ mark, muted, accent, danger }: { mark: Mark; muted: string; accent: string; danger: string }) {
  switch (mark) {
    case 'think': return <>{[92, 102, 112].map(x => <Circle key={x} cx={x} cy={12} r={3.6} color={muted} />)}</>;
    case 'zz': return <>
      <Path path="M94 15H103L94 24H103" color={muted} style="stroke" strokeWidth={2} strokeJoin="round" strokeCap="round" />
      <Path path="M105 5.5H111.5L105 12H111.5" color={muted} style="stroke" strokeWidth={1.6} strokeJoin="round" strokeCap="round" />
    </>;
    case 'badge': return <>
      <Circle cx={104} cy={16} r={10} color={accent} />
      <RoundedRect x={102.8} y={9} width={2.4} height={8.5} r={1.2} color="#ffffff" />
      <Circle cx={104} cy={21.2} r={1.5} color="#ffffff" />
    </>;
    case 'question': return <>
      <Path path="M100 10Q100 4 106 4Q112 4 112 10Q112 14 106 16V19" color={danger} style="stroke" strokeWidth={3} strokeCap="round" strokeJoin="round" />
      <Circle cx={106} cy={24} r={1.8} color={danger} />
    </>;
    default: return null;
  }
}
