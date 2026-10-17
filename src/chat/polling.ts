export function nextPollDelay(pending: boolean, failures: number, elapsedMs: number): number | null {
  if (!pending || failures >= 3 || elapsedMs >= 600000) return null;
  return failures ? Math.min(60000, 3000 * 2 ** failures) : 3000;
}
