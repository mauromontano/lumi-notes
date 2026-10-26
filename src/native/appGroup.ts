import { Platform } from 'react-native';
// T40: the App Group the widget, Siri's intent and the share extension share with the app. Outside an iOS build with
// the native module (tests, Expo Go, the demo) every call is a no-op.
const GROUP = 'group.com.mauro.luminotes';
type Storage = { get(key: string): string | null; set(key: string, value: string | undefined): void; remove(key: string): void };
let storage: Storage | null | undefined;
function open(): Storage | null {
  if (storage !== undefined) return storage;
  try {
    if (Platform.OS !== 'ios') throw new Error('ios only');
    // Required lazily: the module reads the global expo object when loaded, which tests and the web lack.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { ExtensionStorage } = require('@bacons/apple-targets') as { ExtensionStorage: new (group: string) => Storage };
    storage = new ExtensionStorage(GROUP);
  } catch { storage = null; }
  return storage;
}
export const appGroup = {
  get: (key: string) => { try { return open()?.get(key) ?? null; } catch { return null; } },
  set: (key: string, value: string) => { try { open()?.set(key, value); } catch {} },
  remove: (key: string) => { try { open()?.remove(key); } catch {} },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  reloadWidget: () => { try { if (open()) (require('@bacons/apple-targets') as { ExtensionStorage: { reloadWidget(kind?: string): void } }).ExtensionStorage.reloadWidget('LumiToday'); } catch {} },
};
