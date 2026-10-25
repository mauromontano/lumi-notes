import { HttpChatGateway, serverUrl } from '../HttpChatGateway';
const message = { id: 'server-id', clientMessageId: 'client-id', status: 'queued' };
function setup(responses: { status: number; body?: unknown }[]) {
  const requests: { url: string; options: RequestInit }[] = [];
  const fetch = jest.fn(async (url: string, options: RequestInit) => {
    requests.push({ url, options });
    const r = responses.shift()!;
    return { status: r.status, ok: r.status >= 200 && r.status < 300, json: async () => r.body } as Response;
  });
  const gateway = new HttpChatGateway('https://lumi.example', async () => 'personal-device-token', fetch, input => { const form = new FormData(); form.append('clientUploadId', input.clientMessageId); return form; });
  return { gateway, requests, fetch };
}
test('enrollment is anonymous and normal requests carry the personal token', async () => {
  const f = setup([{ status: 200, body: { deviceId: 'd', token: 't' } }, { status: 200, body: { items: [] } }]);
  await f.gateway.enrollDevice('one-use-code'); await f.gateway.listTopics();
  expect(f.requests[0].options.headers).not.toHaveProperty('Authorization');
  expect(JSON.parse(f.requests[0].options.body as string)).toEqual({ code: 'one-use-code', deviceName: 'Lumi iPhone' });
  expect(f.requests[1].options.headers).toHaveProperty('Authorization', 'Bearer personal-device-token');
});
test('202 unwraps accepted messages and retry uses server ID instead of client ID', async () => {
  const f = setup([{ status: 202, body: { message } }, { status: 202, body: { message } }]);
  expect(await f.gateway.sendText({ topicId: 'topic', clientMessageId: 'client-id', text: 'Hola' })).toEqual(message);
  await f.gateway.retryMessage({ topicId: 'topic', clientMessageId: 'client-id', messageId: 'server-id' });
  expect(f.requests[1].url).toBe('https://lumi.example/v1/topics/topic/messages/server-id/retry');
  await expect(f.gateway.retryMessage({ topicId: 'topic', clientMessageId: 'client-id' })).rejects.toMatchObject({ code: 'message_id_required' });
});
test('opaque cursors are encoded unchanged and null page endings normalize', async () => {
  const f = setup([{ status: 200, body: { items: [], nextBefore: null } }, { status: 200, body: { items: [], nextCursor: 'opaque', hasMore: false } }]);
  expect((await f.gateway.listMessages('topic', 'opaque+/=')).nextBefore).toBeUndefined();
  await f.gateway.getChanges('opaque+/=');
  expect(f.requests[0].url).toContain('before=opaque%2B%2F%3D'); expect(f.requests[1].url).toContain('after=opaque%2B%2F%3D');
});
test.each([[401, 'unauthorized'], [429, 'rate_limited'], [410, 'attachment_expired'], [422, 'invalid_cursor']])('HTTP %i preserves structured code %s', async (status, code) => {
  const f = setup([{ status, body: { error: { code, message: 'Mensaje seguro', retryable: status === 429 } } }]);
  await expect(f.gateway.listTopics()).rejects.toMatchObject({ code, message: 'Mensaje seguro', retryable: status === 429 });
});
test('upload retries keep stable identifiers and only accepted attachment IDs go into messages', async () => {
  const f = setup([{ status: 200, body: { attachment: { id: 'attachment-id' } } }, { status: 202, body: { message } }]);
  await f.gateway.sendAttachment({ topicId: 'topic', clientMessageId: 'client-id', localUri: 'file:///private.pdf', mimeType: 'application/pdf', fileName: 'file.pdf', caption: 'Resumen' });
  expect(f.requests[0].options.body).toBeInstanceOf(FormData); expect(f.requests[0].options.headers).not.toHaveProperty('Content-Type');
  expect(JSON.parse(f.requests[1].options.body as string)).toEqual({ clientMessageId: 'client-id', kind: 'document', attachmentId: 'attachment-id', text: 'Resumen' });
});
test('204 has no JSON body, and unstructured failures never expose raw diagnostics', async () => {
  const f = setup([{ status: 204 }, { status: 500, body: { secret: 'provider credential' } }]);
  await expect(f.gateway.markRead('topic', 'server-id')).resolves.toBeUndefined();
  await expect(f.gateway.listTopics()).rejects.toMatchObject({ code: 'server_error', message: 'El servidor no pudo completar el pedido.' });
});
test('network failures are retryable and do not automatically resend', async () => {
  const f = setup([]); f.fetch.mockRejectedValueOnce(Error('private network details'));
  await expect(f.gateway.sendText({ topicId: 't', clientMessageId: 'c', text: 'Hi' })).rejects.toMatchObject({ code: 'network', retryable: true });
  expect(f.fetch).toHaveBeenCalledTimes(1);
});
test('HTTP is rejected except explicitly permitted private development hosts', () => {
  expect(() => serverUrl('http://public.example')).toThrow();
  expect(() => serverUrl('https://user:password@lumi.example')).toThrow();
  expect(() => serverUrl('https://lumi.example/path')).toThrow();
  expect(serverUrl('http://192.168.1.2:3091', true)).toBe('http://192.168.1.2:3091');
});
test('approvals, inbox and notification settings use the E16 routes', async () => {
  const f = setup([{ status: 202, body: { actionId: 'a', status: 'approved' } }, { status: 200, body: { items: [{ id: 'a' }] } }, { status: 200, body: { quietHours: {}, rules: [] } }, { status: 200, body: { quietHours: {}, rules: [] } }]);
  expect(await f.gateway.decideAction('m/1', { actionId: 'a:approve', clientMessageId: 'c' })).toEqual({ actionId: 'a', status: 'approved' });
  expect(f.requests[0].url).toBe('https://lumi.example/v1/messages/m%2F1/actions');
  expect(f.requests[0].options.method).toBe('POST');
  expect(JSON.parse(f.requests[0].options.body as string)).toEqual({ actionId: 'a:approve', clientMessageId: 'c' });
  expect(await f.gateway.inbox()).toEqual([{ id: 'a' }]);
  await f.gateway.notificationSettings();
  await f.gateway.updateNotificationSettings({ rules: [{ agent: 'gym', eventKind: 'reply', level: 'silent' }] });
  expect(f.requests[3].options.method).toBe('PATCH');
  expect(f.requests.map(r => r.url.replace('https://lumi.example/v1', ''))).toEqual(['/messages/m%2F1/actions', '/inbox', '/notification-settings', '/notification-settings']);
});
