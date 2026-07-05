import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAiEnabled, setAiEnabled } from '../prefs';

describe('prefs · aiEnabled', () => {
  beforeEach(() => AsyncStorage.clear());

  it('default es true cuando no hay valor guardado', async () => {
    expect(await getAiEnabled()).toBe(true);
  });

  it('persiste apagado y encendido', async () => {
    await setAiEnabled(false);
    expect(await getAiEnabled()).toBe(false);
    await setAiEnabled(true);
    expect(await getAiEnabled()).toBe(true);
  });
});
