/** Local types of the central ODD's HTTP v1. No provider/domain logic belongs here. */
export type Topic = { id: string; title: string; enabled: boolean; unreadCount: number };
export type Status = 'queued' | 'processing' | 'completed' | 'needs_input' | 'waiting_quota' | 'failed';
export type Attachment = { id: string; fileName: string; mimeType: string; sizeBytes: number; durationMs?: number; availability: 'available' | 'expired' | 'failed'; expiresAt?: string; transcript?: string; transcriptionStatus?: 'pending' | 'completed' | 'failed' };
export type Message = { id: string; topicId: string; clientMessageId?: string; createdAt: string; updatedAt: string; revision: number; origin: 'user' | 'assistant' | 'job'; kind: 'text' | 'audio' | 'image' | 'document' | 'event'; text?: string; status: Status; attachment?: Attachment; reportRefs?: string[]; replyToMessageId?: string; error?: { code: string; message: string; retryable: boolean } };
export type Change = { id: string; type: 'message.upsert'; entityId: string; revision: number; payload: Message } | { id: string; type: 'topic.upsert'; entityId: string; revision: number; payload: Topic };
export type SendText = { topicId: string; clientMessageId: string; text: string };
export type SendAttachment = { topicId: string; clientMessageId: string; localUri: string; mimeType: string; fileName: string; caption?: string };
export type SendAudio = { topicId: string; clientMessageId: string; localUri: string; mimeType: string; durationMs: number };
export type Bootstrap = { apiVersion: 1; topics: Topic[]; changesCursor: string; limits: { maxAttachmentBytes: number; maxAudioDurationMs: number; maxPdfPages: number } };
export interface ChatGateway {
  readonly simulated: boolean;
  enrollDevice(code: string): Promise<{ deviceId: string; token: string }>;
  bootstrap(): Promise<Bootstrap>;
  listTopics(): Promise<Topic[]>;
  listMessages(topicId: string, cursor?: string): Promise<{ items: Message[]; nextBefore?: string }>;
  sendText(input: SendText): Promise<Message>;
  sendAudio(input: SendAudio): Promise<Message>;
  sendAttachment(input: SendAttachment): Promise<Message>;
  retryMessage(input: { topicId: string; clientMessageId: string }): Promise<Message>;
  getChanges(cursor: string): Promise<{ items: Change[]; nextCursor: string; hasMore: boolean }>;
  markRead(topicId: string, messageId: string): Promise<void>;
  registerPushToken(token: string | null): Promise<void>;
  getReportLink(reportId: string): Promise<{ url: string; expiresAt: string }>;
  getAttachmentAccess(id: string): Promise<{ url: string; expiresAt: string }>;
}
export class GatewayError extends Error {
  constructor(public code: string, message: string, public retryable = false) { super(message); }
}
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  const byId = new Map(current.map(m => [m.id, m]));
  for (const m of incoming) if (!byId.has(m.id) || byId.get(m.id)!.revision < m.revision) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}
export const limits = { maxAttachmentBytes: 25 * 1024 * 1024, maxAudioDurationMs: 300000, maxPdfPages: 30 };
export function validateFile(mime: string, size: number, duration?: number) {
  if (!['image/jpeg', 'image/png', 'image/heic', 'application/pdf', 'audio/mp4', 'audio/m4a'].includes(mime)) throw new GatewayError('unsupported_media', 'Elegí JPEG, PNG, HEIC, PDF o audio M4A.');
  if (!size || size > limits.maxAttachmentBytes) throw new GatewayError('file_size', 'El archivo debe tener contenido y pesar hasta 25 MiB.');
  if (duration !== undefined && (duration <= 0 || duration > limits.maxAudioDurationMs)) throw new GatewayError('audio_duration', 'El audio debe durar entre 1 segundo y 5 minutos.');
}
