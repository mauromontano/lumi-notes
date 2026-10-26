import { limits } from '@/chat/types';
// T40: what came from the share sheet, as something Lumi can send: text and links as a message, one photo or PDF as
// an attachment (with the text as its caption). Anything else says why up front.
type SharedFile = { path: string; mimeType: string; fileName: string; size: number | null };
export type Shared = { text?: string | null; webUrl?: string | null; files?: SharedFile[] | null };
export type Draft = { kind: 'text'; text: string } | { kind: 'file'; uri: string; mimeType: string; fileName: string; caption?: string } | { kind: 'unsupported'; reason: string };
const FILES = ['image/jpeg', 'image/png', 'image/heic', 'application/pdf'];
export function sharedDraft(s: Shared): Draft | null {
  // expo-share-intent also copies a link found in the text into webUrl: it goes once.
  const body = s.text?.trim() ?? '', url = s.webUrl?.trim() ?? '';
  const text = (url && !body.includes(url) ? [body, url] : [body]).filter(Boolean).join('\n').slice(0, 12000);
  const file = s.files?.[0];
  if (file) {
    if (!FILES.includes(file.mimeType)) return { kind: 'unsupported', reason: 'Lumi recibe fotos (JPEG, PNG, HEIC), PDF, texto y links.' };
    if ((file.size ?? 0) > limits.maxAttachmentBytes) return { kind: 'unsupported', reason: 'El archivo pasa los 25 MB.' };
    return { kind: 'file', uri: file.path, mimeType: file.mimeType, fileName: file.fileName, ...(text ? { caption: text } : {}) };
  }
  return text ? { kind: 'text', text } : null;
}
