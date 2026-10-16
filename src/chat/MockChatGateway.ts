import { fixtures, topics } from './fixtures';
import { Attachment, Change, ChatGateway, GatewayError, limits, Message, SendAttachment, SendAudio, SendText, validateFile } from './types';
function clone<T>(value: T): T { return JSON.parse(JSON.stringify(value)); }
/** In-memory HTTP-v1 double. URI lookup is adapter-private, never part of Message. */
export class MockChatGateway implements ChatGateway {
  readonly simulated = true;
  private messages = clone(fixtures);
  private topics = clone(topics);
  private changes: Change[] = [];
  private payloads = new Map<string, string>();
  private localFiles = new Map<string, string>();
  private sequence = 10;
  private retried = new Set<string>();
  private uuid: () => string;
  constructor(uuid?: () => string, private fileSize: (uri: string) => number = () => 1024) {
    this.uuid = uuid ?? (() => `90000000-0000-4000-8000-${String(++this.sequence).padStart(12, '0')}`);
  }
  async enrollDevice(code: string) {
    if (code !== 'LUMI-DEMO') throw new GatewayError('invalid_code', 'Para esta demo usá LUMI-DEMO. El servidor real genera códigos de un uso.');
    return { deviceId: this.uuid(), token: 'simulated-device-token' };
  }
  async bootstrap() { return { apiVersion: 1 as const, topics: await this.listTopics(), changesCursor: String(this.changes.length), limits }; }
  async listTopics() { return clone(this.topics); }
  async listMessages(topicId: string, cursor?: string) {
    const all = this.messages.filter(m => m.topicId === topicId).sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
    const end = cursor ? Number(cursor) : all.length;
    return { items: clone(all.slice(Math.max(0, end - 50), end)), nextBefore: end > 50 ? String(end - 50) : undefined };
  }
  private emit(message: Message) {
    this.changes.push({ id: this.uuid(), type: 'message.upsert', entityId: message.id, revision: message.revision, payload: clone(message) });
  }
  private async accept(input: SendText | SendAttachment | SendAudio, kind: Message['kind'], attachment?: Attachment) {
    if (!this.topics.find(t => t.id === input.topicId)?.enabled) throw new GatewayError('topic_disabled', 'Este tema es solo un ejemplo.');
    const key = input.topicId + input.clientMessageId;
    const payload = JSON.stringify(input);
    const old = this.messages.find(m => m.topicId === input.topicId && m.clientMessageId === input.clientMessageId);
    if (old) {
      if (this.payloads.get(key) !== payload) throw new GatewayError('conflict', 'Ese envío ya existe con otro contenido.');
      return clone(old);
    }
    this.payloads.set(key, payload);
    const now = new Date().toISOString();
    const message: Message = { id: this.uuid(), topicId: input.topicId, clientMessageId: input.clientMessageId, createdAt: now, updatedAt: now, revision: 1, origin: 'user', kind, text: 'text' in input ? input.text : 'caption' in input ? input.caption : undefined, attachment, status: 'queued' };
    this.messages.push(message); this.emit(message);
    return clone(message);
  }
  async sendText(input: SendText) {
    if (!input.text.trim()) throw new GatewayError('invalid_text', 'Escribí un mensaje.');
    return this.accept(input, 'text');
  }
  async sendAudio(input: SendAudio) { return this.upload(input, 'audio', 'audio.m4a'); }
  async sendAttachment(input: SendAttachment) { return this.upload(input, input.mimeType.startsWith('image/') ? 'image' : 'document', input.fileName); }
  private async upload(input: SendAudio | SendAttachment, kind: Message['kind'], fileName: string) {
    const sizeBytes = this.fileSize(input.localUri);
    validateFile(input.mimeType, sizeBytes, 'durationMs' in input ? input.durationMs : undefined);
    const id = this.uuid();
    this.localFiles.set(id, input.localUri);
    return this.accept(input, kind, { id, fileName, mimeType: input.mimeType, sizeBytes, availability: 'available', ...('durationMs' in input ? { durationMs: input.durationMs, transcriptionStatus: 'pending' as const } : {}) });
  }
  async retryMessage({ topicId, clientMessageId }: { topicId: string; clientMessageId: string }) {
    const m = this.messages.find(m => m.topicId === topicId && m.clientMessageId === clientMessageId);
    if (!m) throw new GatewayError('not_found', 'No se encontró el envío.', true);
    if (m.status === 'failed' || m.status === 'waiting_quota') { m.status = 'queued'; m.error = undefined; this.retried.add(m.id); m.revision++; this.emit(m); }
    return clone(m);
  }
  async getChanges(cursor: string) {
    if (!/^\d+$/.test(cursor) || Number(cursor) > this.changes.length) throw new GatewayError('cursor_expired', 'Actualizando historial.');
    // Advance only when polled; no background worker or AI is implied.
    for (const m of [...this.messages]) {
      if (!['queued', 'processing'].includes(m.status)) continue;
      if (m.status === 'queued') m.status = 'processing';
      else {
        m.status = this.retried.has(m.id) ? 'completed' : m.text?.includes('/cuota') ? 'waiting_quota' : m.text?.includes('/error') ? 'failed' : m.text?.includes('/aclarar') ? 'needs_input' : 'completed';
        if (m.status === 'failed') m.error = { code: 'demo_failure', message: 'Error simulado de procesamiento. Conservamos tu mensaje.', retryable: true };
        if (m.attachment?.transcriptionStatus) { m.attachment.transcriptionStatus = 'completed'; m.attachment.transcript = 'Transcripción de ejemplo. Esta demo no interpreta el audio grabado.'; }
        if (m.status === 'completed' || m.status === 'needs_input') {
          const reply: Message = { id: this.uuid(), topicId: m.topicId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), revision: 1, origin: 'assistant', kind: 'text', status: m.status, replyToMessageId: m.id, text: m.status === 'needs_input' ? 'Aclaración simulada: ¿en qué moneda fue el importe?' : 'Respuesta simulada: recibí tu mensaje. No se registró ningún movimiento financiero.' };
          this.messages.push(reply); this.emit(reply);
        }
      }
      m.revision++; m.updatedAt = new Date().toISOString(); this.emit(m);
    }
    const start = Number(cursor), items = this.changes.slice(start, start + 100);
    return { items: clone(items), nextCursor: String(start + items.length), hasMore: start + items.length < this.changes.length };
  }
  async markRead(topicId: string, messageId: string) {
    if (!this.messages.some(m => m.id === messageId && m.topicId === topicId)) return;
    const topic = this.topics.find(t => t.id === topicId)!;
    topic.unreadCount = 0;
  }
  async registerPushToken(_token: string | null) { /* Demo has no push service. */ }
  async getReportLink(_id: string): Promise<{ url: string; expiresAt: string }> { throw new GatewayError('demo_report', 'Reporte de ejemplo. La integración habilitará un enlace privado temporal; no hay finanzas reales en esta demo.'); }
  async getAttachmentAccess(id: string) {
    const attachment = this.messages.find(m => m.attachment?.id === id)?.attachment;
    if (attachment?.availability === 'expired') throw new GatewayError('attachment_expired', 'El audio expiró. La transcripción se conserva.');
    const url = this.localFiles.get(id);
    if (!url) throw new GatewayError('file_unavailable', 'El archivo de esta demo ya no está disponible.');
    return { url, expiresAt: new Date(Date.now() + 900000).toISOString() };
  }
}
