export function normalizeVolume(raw: number): number {
  return Math.min(1, Math.max(0, (raw + 2) / 12));
}

export function mergeTranscript(finalized: string, interim: string): string {
  return [finalized, interim].filter(Boolean).join(' ');
}

// códigos del Web Speech API que emite expo-speech-recognition
export function dictationErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'audio-capture':
      return 'No tengo acceso al micrófono. Activalo en Ajustes de iOS → Lumi Notes.';
    case 'service-not-allowed':
      return 'El dictado está desactivado. Activá Siri y Dictado en Ajustes de iOS → General → Teclado.';
    case 'network':
      return 'El servicio de dictado necesita conexión. Revisá tu internet y probá de nuevo.';
    case 'language-not-supported':
      return 'El reconocimiento de voz en español no está disponible en este dispositivo.';
    case 'no-speech':
      return 'No te escuché. Probá de nuevo.';
    case 'aborted':
      return '';
    default:
      return `No pude iniciar el dictado (${code}). Probá de nuevo.`;
  }
}
