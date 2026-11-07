// The bots answer in Markdown; the chat shows a small, safe subset of it. Pure functions so they test without RN.
// Anything it does not recognise stays as plain text, so a message is never lost to a parsing mistake.
export type Span = { text: string; bold?: boolean; italic?: boolean; code?: boolean; link?: string };
export type Block =
  | { kind: 'paragraph' | 'heading' | 'bullet' | 'code' | 'row'; spans: Span[] }
  | { kind: 'number'; marker: string; spans: Span[] };

// `code`, **bold** or __bold__, *italic* (never inside a word, so 2 * 3 or file_name stay as they are) and
// [text](https://…). A closing ** not followed by * lets **a *b*** end on the last pair.
const INLINE = /`([^`\n]+)`|\*\*(?=\S)([^\n]+?)(?<=\S)\*\*(?!\*)|__(?=\S)([^\n]+?)(?<=\S)__|(?<![\w*])\*(?=[^\s*])([^*\n]+?)(?<=[^\s*])\*(?![\w*])|\[([^\]\n]+)\]\((https?:\/\/[^\s)]+)\)/g;

function inline(text: string, style: Omit<Span, 'text'> = {}): Span[] {
  const spans: Span[] = [];
  const push = (s: Span) => {
    if (!s.text) return;
    const last = spans[spans.length - 1];
    const same = last && !last.code && !s.code && last.bold === s.bold && last.italic === s.italic && last.link === s.link;
    if (same) last.text += s.text; else spans.push(s);
  };
  let at = 0;
  for (const m of text.matchAll(INLINE)) {
    push({ text: text.slice(at, m.index), ...style });
    const [, code, bold, bold2, italic, label, url] = m;
    if (code !== undefined) push({ text: code, ...style, code: true });
    else if (bold !== undefined || bold2 !== undefined) inline(bold ?? bold2, { ...style, bold: true }).forEach(push);
    else if (italic !== undefined) inline(italic, { ...style, italic: true }).forEach(push);
    else push({ text: label, ...style, link: url });
    at = m.index + m[0].length;
  }
  push({ text: text.slice(at), ...style });
  return spans.map(s => Object.fromEntries(Object.entries(s).filter(([, v]) => v !== undefined)) as Span);
}

export function parseMessage(text: string): Block[] {
  const blocks: Block[] = [], lines = text.replace(/\r\n?/g, '\n').split('\n');
  let paragraph: string[] = [];
  const flush = () => { if (paragraph.length) blocks.push({ kind: 'paragraph', spans: inline(paragraph.join('\n')) }); paragraph = []; };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i], trimmed = line.trim();
    if (trimmed.startsWith('```')) {
      flush();
      const body: string[] = [];
      while (++i < lines.length && !lines[i].trim().startsWith('```')) body.push(lines[i]);
      blocks.push({ kind: 'code', spans: [{ text: body.join('\n'), code: true }] });
      continue;
    }
    if (!trimmed || /^([-*_])(\s*\1){2,}$/.test(trimmed)) { flush(); continue; }
    if (/^\|.*\|$/.test(trimmed)) {
      // A table is unreadable as pipes on a phone: each row becomes one line, the header (before |---|) in bold.
      flush();
      const cells = (row: string) => row.slice(1, -1).split('|').map(c => c.trim());
      const header = /^\|?\s*:?-{3,}/.test(lines[i + 1]?.trim() ?? '');
      blocks.push({ kind: 'row', spans: inline(cells(trimmed).join(' · '), header ? { bold: true } : {}) });
      if (header) i++;
      continue;
    }
    const heading = trimmed.match(/^#{1,6}\s+(.*)$/), bullet = line.match(/^\s*[-*•]\s+(.*)$/), number = line.match(/^\s*(\d{1,3})[.)]\s+(.*)$/);
    if (heading) { flush(); blocks.push({ kind: 'heading', spans: inline(heading[1]) }); }
    else if (bullet) { flush(); blocks.push({ kind: 'bullet', spans: inline(bullet[1]) }); }
    else if (number) { flush(); blocks.push({ kind: 'number', marker: `${number[1]}.`, spans: inline(number[2]) }); }
    else paragraph.push(line);
  }
  flush();
  return blocks;
}
