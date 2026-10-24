import app from '../../app.json';
import eas from '../../eas.json';
const expo = app.expo as Record<string, any>;
const plugins = expo.plugins as (string | [string, Record<string, unknown>])[];
const plugin = (name: string) => plugins.find(p => (Array.isArray(p) ? p[0] : p) === name);
test('OTA updates point at this EAS project and only reach builds with the same native code', () => {
  expect(expo.updates?.url).toBe(`https://u.expo.dev/${expo.extra.eas.projectId}`);
  expect(expo.runtimeVersion).toEqual({ policy: 'fingerprint' });
});
test('every installable profile has an update channel', () => {
  for (const name of ['preview', 'preview-connected', 'production'] as const) expect((eas.build as Record<string, { channel?: string }>)[name].channel).toBeTruthy();
});
test('production talks to the real server instead of falling back to the demo', () => {
  expect((eas.build.production as { env?: Record<string, string> }).env?.EXPO_PUBLIC_CHAT_MODE).toBe('http');
});
test('Face ID ships in the native build so approvals can arrive later by OTA', () => {
  const auth = plugin('expo-local-authentication');
  expect(Array.isArray(auth) && typeof auth[1].faceIDPermission === 'string' && (auth[1].faceIDPermission as string).length > 20).toBe(true);
});
