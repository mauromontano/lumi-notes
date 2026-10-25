import { approveFromPush, decide, mailDraftError, mailEdits, responseIntent, statusLabel } from '../approvals';
import { GatewayError, type ActionButton } from '../types';
const id = 'a2156936-088a-4df5-aa38-b87f4edaa802', topicId = 'b2156936-088a-4df5-aa38-b87f4edaa802';
const approve: ActionButton = { id: `${id}:approve`, label: 'Abrir PR', style: 'primary', requiresAuth: true };
const reject: ActionButton = { id: `${id}:reject`, label: 'Ahora no', style: 'secondary', requiresAuth: false };
function port() { return { decideAction: jest.fn(async (_m: string, body: { actionId: string; clientMessageId: string }) => ({ actionId: id, status: body.actionId.endsWith('approve') ? 'approved' as const : 'rejected' as const })) }; }
test('approving something that leaves the phone asks Face ID first', async () => {
  const g = port(), auth = jest.fn(async () => true);
  expect(await decide(g, 'm1', approve, auth, () => 'c1')).toEqual({ actionId: id, status: 'approved' });
  expect(auth).toHaveBeenCalledWith('Confirmá: Abrir PR');
  expect(g.decideAction).toHaveBeenCalledWith('m1', { actionId: approve.id, clientMessageId: 'c1' });
});
test('a cancelled Face ID never reaches the server and leaves the card pending', async () => {
  const g = port();
  await expect(decide(g, 'm1', approve, async () => false, () => 'c1')).rejects.toMatchObject({ code: 'auth_cancelled' });
  expect(g.decideAction).not.toHaveBeenCalled();
});
test('Ahora no does not ask Face ID', async () => {
  const g = port(), auth = jest.fn(async () => true);
  expect((await decide(g, 'm1', reject, auth, () => 'c2')).status).toBe('rejected');
  expect(auth).not.toHaveBeenCalled();
});
test('server errors surface as they are', async () => {
  const g = { decideAction: jest.fn(async () => { throw new GatewayError('action_expired', 'La propuesta venció; pedila de nuevo.'); }) };
  await expect(decide(g, 'm1', reject, async () => true, () => 'c3')).rejects.toMatchObject({ code: 'action_expired' });
});
test('push buttons: Aprobar opens the chat to confirm there, tapping opens it, Ahora no only dismisses', () => {
  const data = { topicId, messageId: 'm1', category: 'approval' };
  expect(responseIntent('approve', data)).toEqual({ kind: 'approve', topicId, messageId: 'm1' });
  expect(responseIntent('expo.modules.notifications.actions.DEFAULT', data)).toEqual({ kind: 'open', topicId, messageId: 'm1' });
  expect(responseIntent('reject', data)).toBeNull();
  expect(responseIntent('approve', { topicId: 'nope', messageId: 'm1' })).toBeNull();
  expect(responseIntent('expo.modules.notifications.actions.DEFAULT', undefined)).toBeNull();
});
test('every approval state has a label', () => {
  for (const s of ['pending', 'approved', 'rejected', 'expired', 'failed', 'done'] as const) expect(statusLabel[s]).toBeTruthy();
});
test('Aprobar from the push finds the pending card and still asks Face ID', async () => {
  const item = { id, kind: 'repo.propose', summary: 'PR', status: 'pending' as const, requiresAuth: true, expiresAt: '2026-10-31T00:00:00Z', messageId: 'm1', topicId, agent: 'gym', actions: [approve, reject] };
  const g = { ...port(), inbox: jest.fn(async () => [item]) }, auth = jest.fn(async () => true);
  expect(await approveFromPush(g, 'm1', auth, () => 'c4')).toEqual({ actionId: id, status: 'approved' });
  expect(auth).toHaveBeenCalledTimes(1);
  expect(await approveFromPush({ ...g, inbox: jest.fn(async () => []) }, 'm1', auth, () => 'c5')).toBeNull();
});
const mail = { to: ['ana@x.com'], cc: [], subject: 'Turno', body: 'Hola Ana.', attachments: [] };
test('a mail card sends only the words Mauro changed, and only when approving', async () => {
  expect(mailEdits(mail, { subject: 'Turno', body: 'Hola Ana.' })).toBeUndefined();
  expect(mailEdits(mail, { subject: ' Turno del jueves ', body: 'Hola Ana.' })).toEqual({ subject: 'Turno del jueves' });
  const g = port();
  await decide(g, 'm1', approve, async () => true, () => 'c4', { body: 'Hola Ana, confirmo.' });
  expect(g.decideAction).toHaveBeenCalledWith('m1', { actionId: approve.id, clientMessageId: 'c4', edits: { body: 'Hola Ana, confirmo.' } });
  await decide(g, 'm1', reject, async () => true, () => 'c5', { body: 'x' });
  expect(g.decideAction).toHaveBeenLastCalledWith('m1', { actionId: reject.id, clientMessageId: 'c5' });
});
test('an edited mail is checked before Face ID: one-line subject, nothing empty', () => {
  expect(mailDraftError({ subject: 'Turno', body: 'Hola.' })).toBeNull();
  expect(mailDraftError({ subject: 'Turno\nBcc: x@y.com', body: 'Hola.' })).toMatch(/una sola línea/);
  expect(mailDraftError({ subject: '  ', body: 'Hola.' })).toMatch(/asunto/);
  expect(mailDraftError({ subject: 'Turno', body: '' })).toMatch(/texto/);
  expect(mailDraftError({ subject: 'x'.repeat(201), body: 'Hola.' })).toMatch(/200/);
});
