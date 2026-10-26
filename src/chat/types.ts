/** Local types of the central ODD's HTTP v1. No provider/domain logic belongs here. */
export type Topic = { id: string; title: string; enabled: boolean; unreadCount: number; agent?: string };
export type Status = 'queued' | 'processing' | 'completed' | 'needs_input' | 'waiting_quota' | 'failed';
export type Attachment = { id: string; fileName: string; mimeType: string; sizeBytes: number; durationMs?: number; availability: 'available' | 'expired' | 'failed'; expiresAt?: string; transcript?: string; transcriptionStatus?: 'pending' | 'completed' | 'failed' };
export type Message = { id: string; topicId: string; clientMessageId?: string; createdAt: string; updatedAt: string; revision: number; origin: 'user' | 'assistant' | 'job'; kind: 'text' | 'audio' | 'image' | 'document' | 'event'; text?: string; status: Status; attachment?: Attachment; reportRefs?: string[]; replyToMessageId?: string; error?: { code: string; message: string; retryable: boolean } ; actions?: ActionButton[]; approvals?: Approval[] };
/** E16 approvals: buttons stay while the card is pending; approvals carry each action's state. */
export type ActionButton = { id: string; label: string; style: 'primary' | 'secondary' | 'link'; requiresAuth: boolean };
/** A mail.send card carries the whole mail (T38): what Mauro approves is exactly what leaves. */
export type MailDraft = { to: string[]; cc: string[]; subject: string; body: string; attachments: string[] };
export type MailEdits = { subject?: string; body?: string };
/** A watch.set card (T39) carries what the summary leaves out: the whole URL, what the bot will be asked and the push level. */
export type WatchDraft = { kind: string; description: string; url?: string; prompt?: string; level?: 'urgent' | 'normal' | 'silent' };
export type Approval = { id: string; kind: string; summary: string; status: 'pending' | 'approved' | 'rejected' | 'expired' | 'failed' | 'done'; requiresAuth: boolean; expiresAt: string; mail?: MailDraft; watch?: WatchDraft };
export type InboxItem = Approval & { messageId: string; topicId: string; agent: string; actions: ActionButton[] };
export type NotifyLevel = 'urgent' | 'normal' | 'silent' | 'digest';
export type EventKind = 'reply' | 'approval' | 'watch' | 'reminder' | 'digest' | 'system';
export type NotificationRule = { agent: string; name: string; eventKind: EventKind; level: NotifyLevel; showText: boolean };
export type NotificationSettings = { quietHours: { start: string; end: string; timeZone: string }; rules: NotificationRule[] };
export type NotificationPatch = { quietHours?: { start: string; end: string }; rules?: { agent: string; eventKind: EventKind; level?: NotifyLevel; showText?: boolean }[] };
/** T39: a watch, a routine or a reminder, as GET /v1/automations lists them. kind is the watch's kind (null otherwise). */
export type Automation = { id: string; type: 'watch' | 'schedule' | 'reminder'; kind: 'github' | 'gmail' | 'ledger' | 'chat' | 'page' | null; agent: string | null; title: string; detail: string; enabled: boolean; toggleable: boolean; origin: 'registry' | 'chat' | null; nextAt: string | null; lastAt: string | null };
export type RunsToday = { total: number; limit: number; agents: { agent: string; runs: number; limit: number }[] };
export type Automations = { items: Automation[]; runsToday: RunsToday };
/** T40: GET /v1/usage. costUsd is an estimate: with Claude Pro it is what the same runs would cost on the API. */
export type UsageTotals = { runs: number; failed: number; turns: number; tokens: number; costUsd: number };
export type Usage = { estimate: boolean; agents: { agent: string; today: UsageTotals; week: UsageTotals }[]; total: { today: UsageTotals; week: UsageTotals } };
/** T40: GET /v1/today, what the home screen widget shows. */
export type Today = { pending: number; nextEvent: { summary: string; start: string; allDay: boolean } | null; nextReminder: { text: string; at: string } | null; agenda: 'ok' | 'failed' | 'off'; updatedAt: string };
export type Change = { id: string; type: 'message.upsert'; entityId: string; revision: number; payload: Message } | { id: string; type: 'topic.upsert'; entityId: string; revision: number; payload: Topic } | { id: string; type: 'automation.upsert'; entityId: string; revision: number; payload: Automation | { id: string; deleted: true } };
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
  retryMessage(input: { topicId: string; clientMessageId: string; messageId?: string }): Promise<Message>;
  getChanges(cursor: string): Promise<{ items: Change[]; nextCursor: string; hasMore: boolean }>;
  markRead(topicId: string, messageId: string): Promise<void>;
  registerPushToken(token: string | null): Promise<void>;
  getReportLink(reportId: string): Promise<{ url: string; expiresAt: string }>;
  getAttachmentAccess(id: string): Promise<{ url: string; expiresAt: string }>;
  decideAction(messageId: string, body: { actionId: string; clientMessageId: string; edits?: MailEdits }): Promise<{ actionId: string; status: Approval['status'] }>;
  inbox(): Promise<InboxItem[]>;
  notificationSettings(): Promise<NotificationSettings>;
  updateNotificationSettings(patch: NotificationPatch): Promise<NotificationSettings>;
  automations(): Promise<Automations>;
  setAutomationEnabled(id: string, enabled: boolean): Promise<Automation>;
  usage(): Promise<Usage>;
  today(): Promise<Today>;
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
