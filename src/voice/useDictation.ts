import { useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { mergeTranscript, normalizeVolume } from './dictationUtils';

export interface Dictation {
  listening: boolean;
  transcript: string;
  volume: SharedValue<number>;
  start(): Promise<'ok' | 'denied'>;
  stop(): void;
  reset(): void;
}

export function useDictation(): Dictation {
  const [listening, setListening] = useState(false);
  const [finalized, setFinalized] = useState('');
  const [interim, setInterim] = useState('');
  const volume = useSharedValue(0);

  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript ?? '';
    if (event.isFinal) {
      setFinalized((prev) => mergeTranscript(prev, text));
      setInterim('');
    } else {
      setInterim(text);
    }
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    volume.value = withTiming(normalizeVolume(event.value), { duration: 90 });
  });

  useSpeechRecognitionEvent('end', () => {
    setListening(false);
    volume.value = withTiming(0, { duration: 200 });
  });

  return {
    listening,
    transcript: mergeTranscript(finalized, interim),
    volume,
    async start() {
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) return 'denied';
      ExpoSpeechRecognitionModule.start({
        lang: 'es-AR',
        interimResults: true,
        continuous: true,
        volumeChangeEventOptions: { enabled: true, intervalMillis: 100 },
      });
      setListening(true);
      return 'ok';
    },
    stop() {
      ExpoSpeechRecognitionModule.stop();
    },
    reset() {
      setFinalized('');
      setInterim('');
    },
  };
}
