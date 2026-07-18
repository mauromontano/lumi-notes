import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme/ThemeContext';
import { LumiOrb } from '../orb/LumiOrb';

type Props = { onFinish: () => void };

// Splash animado en JS: continúa el splash nativo con un orbe que respira y se
// desvanece. Reutiliza LumiOrb (Skia) y el color de fondo del tema para que el
// paso nativo -> JS sea imperceptible.
export function AnimatedSplash({ onFinish }: Props) {
  const { palette } = useTheme();
  const idleVolume = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    // pequeño respiro y luego fade-out
    opacity.value = withDelay(
      800,
      withTiming(0, { duration: 450, easing: Easing.inOut(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onFinish)();
      }),
    );
  }, [opacity, onFinish]);

  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fill, { backgroundColor: palette.bg }, fadeStyle]}
    >
      <LumiOrb state="idle" volume={idleVolume} size={140} />
      <Text style={[styles.wordmark, { color: palette.text }]}>Lumi Notes</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  wordmark: { marginTop: 20, fontSize: 22, fontWeight: '600', letterSpacing: 0.5 },
});
