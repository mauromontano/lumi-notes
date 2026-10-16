/** Treat message text as untrusted, including malformed link-like strings. */
export function messageLinks(text = ''): { url: string; host: string }[] {
  return [...new Set(text.match(/https?:\/\/[^\s<>]+/g) ?? [])].flatMap(candidate => {
    try {
      const url = new URL(candidate.replace(/[),.;!?]+$/, ''));
      return url.hostname && !url.username && !url.password ? [{ url: url.href, host: url.hostname }] : [];
    } catch { return []; }
  });
}
