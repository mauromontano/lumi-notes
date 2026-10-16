import { GatewayError } from './types';
export type PushRegistration = {
  permission(): Promise<boolean>;
  requestPermission(): Promise<boolean>;
  token(): Promise<string>;
  register(token: string | null): Promise<void>;
};
export async function registerNotifications(port: PushRegistration, ask: boolean) {
  let allowed = await port.permission();
  if (!allowed && ask) allowed = await port.requestPermission();
  if (!allowed) {
    await port.register(null);
    if (ask) throw new GatewayError('push_denied', 'Podés habilitar notificaciones para Lumi en Ajustes del iPhone. Los mensajes se conservan igual.');
    return false;
  }
  await port.register(await port.token());
  return true;
}
