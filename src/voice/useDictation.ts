import { useState } from 'react';
import { useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import { mergeTranscript, normalizeVolume } from './dictationUtils';

export interface Dictation {
  listening: boolean;
  transcript: string;
  /** código de error del Web Speech API, o null si no hubo error */
  error: string | null;
  volume: SharedValue<number>;
  start(): Promise<'ok' | 'denied'>;
  stop(): void;
  reset(): void;
}

export function useDictation(): Dictation {
  const [listening, setListening] = useState(false);
  const [finalized, setFinalized] = useState('');
  const [interim, setInterim] = useState('');
  const [error, setError] = useState<string | null>(null);
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

  useSpeechRecognitionEvent('error', (event) => {
    if (event.error === 'aborted') return; // lo disparamos nosotros al frenar
    setError(event.error);
  });

  return {
    listening,
    transcript: mergeTranscript(finalized, interim),
    error,
    volume,
    async start() {
      const perms = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!perms.granted) return 'denied';
      setError(null);
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
      setError(null);
    },
  };
}
