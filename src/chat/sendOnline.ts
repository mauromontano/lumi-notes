import { ChatGateway, GatewayError, SendAttachment, SendAudio, SendText } from './types';
export type Outgoing = { kind: 'text'; input: SendText } | { kind: 'audio'; input: SendAudio } | { kind: 'attachment'; input: SendAttachment };
/** No queue, reconnect listener or timer: one deliberate user action, one attempt. */
export async function sendOnline(gateway: ChatGateway, outgoing: Outgoing, checkOnline: () => Promise<boolean>) {
  if (!await checkOnline()) throw new GatewayError('offline', 'Sin conexión. Reintentá manualmente cuando vuelvas a estar online.', true);
  return outgoing.kind === 'text' ? gateway.sendText(outgoing.input) : outgoing.kind === 'audio' ? gateway.sendAudio(outgoing.input) : gateway.sendAttachment(outgoing.input);
}
