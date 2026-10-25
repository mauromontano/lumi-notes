import * as LocalAuthentication from 'expo-local-authentication';
import { GatewayError, type ActionButton, type Approval, type ChatGateway, type MailDraft, type MailEdits } from './types';
export type Authenticate = (reason: string) => Promise<boolean>;
/** Face ID (or the passcode) before anything that leaves the phone: a mail, a PR, a calendar invite. */
export const faceId: Authenticate = async reason => (await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancelar' })).success;
/** edits (a mail's subject or text) travel only with Aprobar; the server validates the whole mail again. */
export async function decide(gateway: Pick<ChatGateway, 'decideAction'>, messageId: string, button: ActionButton, authenticate: Authenticate, uuid: () => string, edits?: MailEdits) {
  if (button.requiresAuth && !(await authenticate(`Confirmá: ${button.label}`))) throw new GatewayError('auth_cancelled', 'No se confirmó con Face ID; la propuesta sigue pendiente.');
  const withEdits = edits && button.id.endsWith(':approve') ? { edits } : {};
  return gateway.decideAction(messageId, { actionId: button.id, clientMessageId: uuid(), ...withEdits });
}
/** Only what changed, trimmed; undefined when the mail is as the agent left it. */
export function mailEdits(original: MailDraft, draft: { subject: string; body: string }): MailEdits | undefined {
  const subject = draft.subject.trim(), body = draft.body.trim(), out: MailEdits = {};
  if (subject !== original.subject) out.subject = subject;
  if (body !== original.body) out.body = body;
  return Object.keys(out).length ? out : undefined;
}
/** The same rules the server applies, checked before Face ID so a bad edit never costs a confirmation. */
export function mailDraftError(draft: { subject: string; body: string }): string | null {
  const subject = draft.subject.trim();
  if (!subject) return 'Falta el asunto.';
  if (/[\r\n]/.test(subject)) return 'El asunto va en una sola línea.';
  if (subject.length > 200) return 'El asunto puede tener hasta 200 caracteres.';
  if (!draft.body.trim()) return 'Falta el texto del mail.';
  if (draft.body.trim().length > 20000) return 'El texto puede tener hasta 20 000 caracteres.';
  return null;
}
export const statusLabel: Record<Approval['status'], string> = { pending: 'Espera tu OK', approved: 'Aprobada · en curso', rejected: 'Descartada', expired: 'Venció', failed: 'No se pudo hacer', done: 'Hecha' };
/** Push category with the lock-screen buttons. Aprobar opens the app, where Face ID runs; Ahora no only dismisses. */
export const APPROVAL_CATEGORY = 'approval';
export const approvalButtons = [
  { identifier: 'approve', buttonTitle: 'Aprobar', options: { opensAppToForeground: true } },
  { identifier: 'reject', buttonTitle: 'Ahora no', options: { opensAppToForeground: false } },
];
const uuidPattern = /^[0-9a-f-]{36}$/i;
export function responseIntent(actionIdentifier: string, data: Record<string, unknown> | undefined): { kind: 'approve' | 'open'; topicId: string; messageId?: string } | null {
  const topicId = data?.topicId, messageId = typeof data?.messageId === 'string' ? data.messageId : undefined;
  if (typeof topicId !== 'string' || !uuidPattern.test(topicId) || actionIdentifier === 'reject') return null;
  return { kind: actionIdentifier === 'approve' ? 'approve' : 'open', topicId, messageId };
}
/** From the lock screen's Aprobar: the card may already be decided elsewhere, in which case there is nothing to do. */
export async function approveFromPush(gateway: Pick<ChatGateway, 'decideAction' | 'inbox'>, messageId: string, authenticate: Authenticate, uuid: () => string) {
  const button = (await gateway.inbox()).find(i => i.messageId === messageId)?.actions.find(b => b.id.endsWith(':approve'));
  return button ? decide(gateway, messageId, button, authenticate, uuid) : null;
}
