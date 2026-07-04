export const SHARED_TEXT_LIMIT = 8000;

export function prepareSharedText(raw: string): string {
  const clean = raw.trim().replace(/\n{3,}/g, '\n\n');
  if (clean.length <= SHARED_TEXT_LIMIT) return clean;
  return clean.slice(0, SHARED_TEXT_LIMIT - 1) + '…';
}
