import { Approval, Attachment, Automation, Automations, MailEdits, Today, Usage, Bootstrap, Change, ChatGateway, GatewayError, InboxItem, Message, NotificationPatch, NotificationSettings, SendAttachment, SendAudio, SendText, Topic } from './types';

type Transport = (url: string, options: RequestInit) => Promise<Response>;
type UploadBody = (input: SendAttachment | SendAudio, fileName: string) => FormData;
export function serverUrl(value: string, allowLocal = false) {
  const url = new URL(value);
  const local = /^(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(url.hostname);
  if (url.username || url.password || url.search || url.hash || url.pathname !== '/' || (url.protocol !== 'https:' && !(allowLocal && local && url.protocol === 'http:'))) throw new Error('Configurá una URL HTTPS del servidor, sin rutas ni credenciales.');
  return url.origin;
}
export class HttpChatGateway implements ChatGateway {
  readonly simulated = false;
  readonly baseUrl: string;
  constructor(baseUrl: string, private token: () => Promise<string | null>, private transport: Transport, private uploadBody: UploadBody, allowLocal = false) {
    this.baseUrl = serverUrl(baseUrl, allowLocal);
  }
  private async request<T>(path: string, method = 'GET', body?: unknown, anonymous = false): Promise<T> {
    const token = anonymous ? null : await this.token();
    if (!anonymous && !token) throw new GatewayError('unauthorized', 'Vinculá este iPhone para continuar.');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), body instanceof FormData ? 120000 : 30000);
    try {
      const multipart = body instanceof FormData;
      const response = await this.transport(this.baseUrl + '/v1' + path, { method, signal: controller.signal, redirect: 'error', headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(!multipart && body !== undefined ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: multipart ? body : JSON.stringify(body) } : {}) });
      if (response.status === 204) return undefined as T;
      const value = await response.json().catch(() => null);
      if (!response.ok) {
        if (value?.error && typeof value.error.code === 'string' && typeof value.error.message === 'string' && typeof value.error.retryable === 'boolean') throw new GatewayError(value.error.code, value.error.message, value.error.retryable);
        if (response.status === 401) throw new GatewayError('unauthorized', 'Vinculá este iPhone para continuar.');
        throw new GatewayError('server_error', 'El servidor no pudo completar el pedido.', response.status >= 500 || response.status === 429);
      }
      if (!value || typeof value !== 'object') throw new GatewayError('invalid_response', 'No pudimos interpretar la respuesta del servidor.', true);
      return value as T;
    } catch (e) {
      if (e instanceof GatewayError) throw e;
      throw new GatewayError('network', 'No se pudo confirmar el pedido. Reintentá el mismo envío cuando tengas conexión.', true);
    } finally { clearTimeout(timer); }
  }
  enrollDevice(code: string) { return this.request<{ deviceId: string; token: string }>('/devices/enroll', 'POST', { code, deviceName: 'Lumi iPhone' }, true); }
  async bootstrap() {
    const result = await this.request<Bootstrap>('/bootstrap');
    if (result.apiVersion !== 1) throw new GatewayError('api_version', 'Esta versión de Lumi no es compatible con el servidor.');
    return result;
  }
  async listTopics() { return (await this.request<{ items: Topic[] }>('/topics')).items; }
  async listMessages(topicId: string, cursor?: string) {
    const result = await this.request<{ items: Message[]; nextBefore?: string | null }>(`/topics/${encodeURIComponent(topicId)}/messages${cursor ? '?before=' + encodeURIComponent(cursor) : ''}`);
    return { items: result.items, nextBefore: result.nextBefore ?? undefined };
  }
  async sendText(input: SendText) { return (await this.request<{ message: Message }>(`/topics/${encodeURIComponent(input.topicId)}/messages`, 'POST', { clientMessageId: input.clientMessageId, kind: 'text', text: input.text })).message; }
  sendAudio(input: SendAudio) { return this.upload(input, 'audio', 'audio.m4a'); }
  sendAttachment(input: SendAttachment) { return this.upload(input, input.mimeType.startsWith('image/') ? 'image' : 'document', input.fileName); }
  private async upload(input: SendAudio | SendAttachment, kind: string, fileName: string) {
    const form = this.uploadBody(input, fileName);
    const { attachment } = await this.request<{ attachment: Attachment }>('/attachments', 'POST', form);
    return (await this.request<{ message: Message }>(`/topics/${encodeURIComponent(input.topicId)}/messages`, 'POST', { clientMessageId: input.clientMessageId, kind, attachmentId: attachment.id, ...('caption' in input && input.caption?.trim() ? { text: input.caption } : {}) })).message;
  }
  async retryMessage(input: { topicId: string; clientMessageId: string; messageId?: string }) {
    if (!input.messageId) throw new GatewayError('message_id_required', 'Actualizá el historial antes de reintentar.');
    return (await this.request<{ message: Message }>(`/topics/${encodeURIComponent(input.topicId)}/messages/${encodeURIComponent(input.messageId)}/retry`, 'POST')).message;
  }
  getChanges(cursor: string) { return this.request<{ items: Change[]; nextCursor: string; hasMore: boolean }>('/changes?after=' + encodeURIComponent(cursor)); }
  markRead(topicId: string, messageId: string) { return this.request<void>(`/topics/${encodeURIComponent(topicId)}/read`, 'POST', { lastReadMessageId: messageId }); }
  registerPushToken(token: string | null) { return this.request<void>('/devices/current/push-token', 'PUT', token ? { expoPushToken: token } : null); }
  getReportLink(id: string) { return this.request<{ url: string; expiresAt: string }>(`/reports/${encodeURIComponent(id)}/link`, 'POST'); }
  getAttachmentAccess(id: string) { return this.request<{ url: string; expiresAt: string }>(`/attachments/${encodeURIComponent(id)}/access`); }
  decideAction(messageId: string, body: { actionId: string; clientMessageId: string; edits?: MailEdits }) { return this.request<{ actionId: string; status: Approval['status'] }>(`/messages/${encodeURIComponent(messageId)}/actions`, 'POST', body); }
  async inbox() { return (await this.request<{ items: InboxItem[] }>('/inbox')).items; }
  notificationSettings() { return this.request<NotificationSettings>('/notification-settings'); }
  updateNotificationSettings(patch: NotificationPatch) { return this.request<NotificationSettings>('/notification-settings', 'PATCH', patch); }
  automations() { return this.request<Automations>('/automations'); }
  setAutomationEnabled(id: string, enabled: boolean) { return this.request<Automation>(`/automations/${encodeURIComponent(id)}`, 'PATCH', { enabled }); }
  usage() { return this.request<Usage>('/usage'); }
  today() { return this.request<Today>('/today'); }
}
