import * as LocalAuthentication from 'expo-local-authentication';
import { GatewayError, type ActionButton, type Approval, type ChatGateway } from './types';
export type Authenticate = (reason: string) => Promise<boolean>;
/** Face ID (or the passcode) before anything that leaves the phone: a mail, a PR, a calendar invite. */
export const faceId: Authenticate = async reason => (await LocalAuthentication.authenticateAsync({ promptMessage: reason, cancelLabel: 'Cancelar' })).success;
export async function decide(gateway: Pick<ChatGateway, 'decideAction'>, messageId: string, button: ActionButton, authenticate: Authenticate, uuid: () => string) {
  if (button.requiresAuth && !(await authenticate(`Confirmá: ${button.label}`))) throw new GatewayError('auth_cancelled', 'No se confirmó con Face ID; la propuesta sigue pendiente.');
  return gateway.decideAction(messageId, { actionId: button.id, clientMessageId: uuid() });
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
