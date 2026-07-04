import React, { useEffect } from 'react';
import { Canvas, Circle, RadialGradient, vec } from '@shopify/react-native-skia';
import Animated, {
  SharedValue,
  useSharedValue,
  useDerivedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '@/theme/ThemeContext';
import { orbStateColors } from '@/theme/colors';
import type { OrbState } from './orbState';

type Props = {
  state: OrbState;
  volume: SharedValue<number>; // 0..1
  size: number;                // diámetro en px
};

export function LumiOrb({ state, volume, size }: Props) {
  const { palette } = useTheme();
  const breath = useSharedValue(1);
  const spin = useSharedValue(0);

  useEffect(() => {
    cancelAnimation(breath);
    cancelAnimation(spin);
    if (state === 'idle') {
      breath.value = withRepeat(
        withTiming(1.09, { duration: 2600, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else if (state === 'listening') {
      // pulso propio: el orbe respira aunque el volumen no llegue
      breath.value = withRepeat(
        withTiming(1.07, { duration: 1100, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else if (state === 'thinking') {
      breath.value = withRepeat(
        withTiming(1.08, { duration: 600, easing: Easing.inOut(Easing.quad) }),
        -1,
        true,
      );
      spin.value = withRepeat(withTiming(spin.value + 1, { duration: 2000, easing: Easing.linear }), -1);
    } else {
      breath.value = withTiming(1, { duration: 300 });
    }
  }, [state, breath, spin]);

  const scaleStyle = useAnimatedStyle(() => {
    const s = state === 'listening' ? breath.value * (1 + volume.value * 0.25) : breath.value;
    return { transform: [{ scale: s }] };
  });

  const stateColors = state === 'success' || state === 'error' ? orbStateColors[state] : null;
  const colors = stateColors ? stateColors.colors : palette.orb.colors;
  const glow = stateColors ? stateColors.glow : palette.orb.glow;

  const r = size / 2;
  const gradientCenter = useDerivedValue(() => {
    // desplaza el foco del gradiente en círculo cuando gira (thinking)
    const angle = spin.value * 2 * Math.PI;
    return vec(r + Math.cos(angle) * r * 0.25, r * 0.8 + Math.sin(angle) * r * 0.2);
  });

  return (
    <Animated.View style={[{ width: size, height: size }, scaleStyle]}>
      <Canvas style={{ width: size, height: size }}>
        {/* halo: gradiente que se desvanece a transparente para fundirse con cualquier fondo */}
        <Circle cx={r} cy={r} r={r}>
          <RadialGradient
            c={vec(r, r)}
            r={r}
            colors={[`${glow}66`, `${glow}00`]}
            positions={[0.45, 1]}
          />
        </Circle>
        {/* cuerpo del orbe */}
        <Circle cx={r} cy={r} r={r * 0.72}>
          <RadialGradient c={gradientCenter} r={r * 0.95} colors={colors} />
        </Circle>
      </Canvas>
    </Animated.View>
  );
}
