import { messageLinks } from '../links';
import { sendOnline } from '../sendOnline';
import { MockChatGateway } from '../MockChatGateway';
import { FINANCE, SHOPPING } from '../fixtures';
import { mergeMessages, validateFile } from '../types';
// Same synthetic payloads as HTTP v1. Tests do not exercise any server or AI.
describe('HTTP v1 simulated adapter', () => {
  const request = { topicId: FINANCE, clientMessageId: '50000000-0000-4000-8000-000000000001', text: 'Ejemplo' };
  it('returns acceptance before completion and deduplicates timeout replay', async () => {
    const g = new MockChatGateway();
    const first = await g.sendText(request);
    expect(first.status).toBe('queued');
    expect((await g.sendText(request)).id).toBe(first.id);
    await expect(g.sendText({ ...request, text: 'Otro contenido' })).rejects.toMatchObject({ code: 'conflict' });
    const b = await g.bootstrap();
    const p = await g.getChanges(b.changesCursor);
    expect(p.items.some(c => c.type === 'message.upsert' && c.payload.status === 'processing')).toBe(true);
    await g.getChanges(p.nextCursor);
    const finished = await g.retryMessage(request);
    expect(finished.status).toBe('completed');
    expect((await g.listMessages(FINANCE)).items.filter(m => m.clientMessageId === request.clientMessageId)).toHaveLength(1);
  });
  it.each(['/cuota', '/error'])('retries %s without changing id or original text', async text => {
    const g = new MockChatGateway();
    const sent = await g.sendText({ ...request, text });
    await g.getChanges('0'); await g.getChanges('0');
    const retried = await g.retryMessage(request);
    expect(retried.id).toBe(sent.id); expect(retried.text).toBe(text);
    await g.getChanges('0'); await g.getChanges('0');
    expect((await g.sendText({ ...request, text })).status).toBe('completed');
  });
  it('shows clarification and automatic origins, keeps expired transcript', async () => {
    const g = new MockChatGateway();
    await g.sendText({ ...request, text: '/aclarar' });
    await g.getChanges('0'); await g.getChanges('0');
    const { items } = await g.listMessages(FINANCE);
    expect(items.some(m => m.origin === 'assistant' && m.status === 'needs_input')).toBe(true);
    expect(items.some(m => m.origin === 'job')).toBe(true);
    const expired = items.find(m => m.attachment?.availability === 'expired')!;
    expect(expired.attachment?.transcript).toBeTruthy();
    await expect(g.getAttachmentAccess(expired.attachment!.id)).rejects.toMatchObject({ code: 'attachment_expired' });
  });
  it('keeps localUri outside wire messages and resolves audio only through access', async () => {
    const g = new MockChatGateway();
    const m = await g.sendAudio({ ...request, localUri: 'file:///private/audio.m4a', mimeType: 'audio/mp4', durationMs: 1234 });
    expect(JSON.stringify(m)).not.toContain('file:///');
    expect((await g.getAttachmentAccess(m.attachment!.id)).url).toBe('file:///private/audio.m4a');
  });
  it('rejects invalid enrollment, empty text, disabled topic and expired cursor', async () => {
    const g = new MockChatGateway();
    await expect(g.enrollDevice('bad')).rejects.toMatchObject({ code: 'invalid_code' });
    await expect(g.sendText({ ...request, text: ' ' })).rejects.toMatchObject({ code: 'invalid_text' });
    expect((await g.listMessages(SHOPPING)).items).toEqual([]);
    await expect(g.sendText({ ...request, topicId: SHOPPING })).rejects.toMatchObject({ code: 'topic_disabled' });
    await expect(g.getChanges('stale')).rejects.toMatchObject({ code: 'cursor_expired' });
  });
  it('merges updates with history by id/revision, never downgrading', async () => {
    const g = new MockChatGateway(); const old = await g.sendText(request);
    const updated = { ...old, revision: 2, status: 'processing' as const };
    expect(mergeMessages([updated], [old, updated])).toEqual([updated]);
  });
  it('paginates chronologically and merges without duplicates', async () => {
    const g = new MockChatGateway();
    for (let i = 0; i < 55; i++) await g.sendText({ ...request, clientMessageId: `id-${i}` });
    const newest = await g.listMessages(FINANCE), older = await g.listMessages(FINANCE, newest.nextBefore);
    expect(newest.items).toHaveLength(50); expect(older.items).toHaveLength(7);
    const dates = older.items.map(m => m.createdAt);
    expect(dates).toEqual([...dates].sort());
    expect(mergeMessages(newest.items, [...older.items, ...newest.items])).toHaveLength(57);
  });
});
it('validates local upload size, supported format and audio duration', () => {
  expect(() => validateFile('application/pdf', 25 * 1024 * 1024)).not.toThrow();
  expect(() => validateFile('application/pdf', 25 * 1024 * 1024 + 1)).toThrow();
  expect(() => validateFile('text/plain', 20)).toThrow();
  expect(() => validateFile('audio/mp4', 200, 300001)).toThrow();
});

it('ignores malformed URLs and strips prose punctuation without crashing chat', () => {
  expect(messageLinks('https://? https://.')).toEqual([]);
  expect(messageLinks('Ver https://example.org/report.')).toEqual([{ url: 'https://example.org/report', host: 'example.org' }]);
  expect(messageLinks('https://user:password@example.org')).toEqual([]);
});
it('offline attempts never call transport or enqueue work on reconnect', async () => {
  const gateway = new MockChatGateway(); const send = jest.spyOn(gateway, 'sendText');
  const outgoing = { kind: 'text' as const, input: { topicId: FINANCE, clientMessageId: 'same-id', text: 'test' } };
  await expect(sendOnline(gateway, outgoing, async () => false)).rejects.toMatchObject({ code: 'offline' });
  expect(send).not.toHaveBeenCalled();
  await sendOnline(gateway, outgoing, async () => true);
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith(outgoing.input);
});
