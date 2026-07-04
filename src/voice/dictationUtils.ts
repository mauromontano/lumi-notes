export function normalizeVolume(raw: number): number {
  return Math.min(1, Math.max(0, (raw + 2) / 12));
}

export function mergeTranscript(finalized: string, interim: string): string {
  return [finalized, interim].filter(Boolean).join(' ');
}

// variantes de español en orden de preferencia para el dictado
const SPANISH_LOCALE_PREFERENCE = ['es-AR', 'es-US', 'es-MX', 'es-ES'];

/**
 * Elige el mejor locale de español entre los soportados por el dispositivo.
 * Devuelve null si no hay ninguna variante de español; con lista vacía
 * (API sin datos) devuelve 'es-AR' como intento optimista.
 */
export function pickSpanishLocale(supported: string[]): string | null {
  if (supported.length === 0) return 'es-AR';
  // iOS/Android pueden devolver 'es-ES' o 'es_ES', y con mayúsculas variables
  const byNormalized = new Map<string, string>();
  for (const locale of supported) {
    const dashed = locale.replace(/_/g, '-');
    byNormalized.set(dashed.toLowerCase(), dashed);
  }
  for (const pref of SPANISH_LOCALE_PREFERENCE) {
    const match = byNormalized.get(pref.toLowerCase());
    if (match) return match;
  }
  for (const [normalized, dashed] of byNormalized) {
    if (normalized === 'es' || normalized.startsWith('es-')) return dashed;
  }
  return null;
}

// códigos del Web Speech API que emite expo-speech-recognition
export function dictationErrorMessage(code: string): string {
  switch (code) {
    case 'not-allowed':
    case 'audio-capture':
      return 'No tengo acceso al micrófono. Activalo en Ajustes de iOS → Lumi Notes.';
    case 'service-not-allowed':
    case 'recognition-unavailable':
      return 'El dictado está desactivado. Activá Siri y Dictado en Ajustes de iOS → General → Teclado.';
    case 'network':
      return 'El servicio de dictado necesita conexión. Revisá tu internet y probá de nuevo.';
    case 'language-not-supported':
      return 'El reconocimiento de voz en español no está disponible en este dispositivo. Agregá el español en Ajustes de iOS → General → Teclado → Dictado.';
    case 'no-speech':
      return 'No te escuché. Probá de nuevo.';
    case 'aborted':
      return '';
    default:
      return `No pude iniciar el dictado (${code}). Probá de nuevo.`;
  }
}
