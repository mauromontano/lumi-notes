import { registerNotifications } from '../pushRegistration';
function port(allowed: boolean) { return { permission: jest.fn(async () => allowed), requestPermission: jest.fn(async () => allowed), token: jest.fn(async () => 'ExpoPushToken[test]'), register: jest.fn(async (_token: string | null) => {}) }; }
test('denied notifications clear the server token without prompting on background reconciliation', async () => {
  const p = port(false); expect(await registerNotifications(p, false)).toBe(false); expect(p.requestPermission).not.toHaveBeenCalled(); expect(p.token).not.toHaveBeenCalled(); expect(p.register).toHaveBeenCalledWith(null);
});
test('explicit activation asks permission and leaves a useful denial', async () => {
  const p = port(false); await expect(registerNotifications(p, true)).rejects.toMatchObject({ code: 'push_denied' }); expect(p.requestPermission).toHaveBeenCalledTimes(1);
});
test('granted permission registers a fresh token without prompting again', async () => {
  const p = port(true); expect(await registerNotifications(p, true)).toBe(true); expect(p.register).toHaveBeenCalledWith('ExpoPushToken[test]'); expect(p.requestPermission).not.toHaveBeenCalled();
});
