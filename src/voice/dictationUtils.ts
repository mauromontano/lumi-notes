export function normalizeVolume(raw: number): number {
  return Math.min(1, Math.max(0, (raw + 2) / 12));
}

export function mergeTranscript(finalized: string, interim: string): string {
  return [finalized, interim].filter(Boolean).join(' ');
}
