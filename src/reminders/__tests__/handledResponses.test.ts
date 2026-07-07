import AsyncStorage from '@react-native-async-storage/async-storage';
import { loadHandled, markHandled } from '../handledResponses';

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('handledResponses', () => {
  it('loadHandled arranca vacío', async () => {
    expect(await loadHandled()).toEqual([]);
  });

  it('markHandled persiste la clave y loadHandled la recupera', async () => {
    await markHandled('a:snooze-1h:0');
    expect(await loadHandled()).toEqual(['a:snooze-1h:0']);
  });

  it('no duplica claves ya marcadas', async () => {
    await markHandled('k');
    await markHandled('k');
    expect(await loadHandled()).toEqual(['k']);
  });

  it('acota a las últimas 30 claves', async () => {
    for (let i = 0; i < 35; i++) await markHandled(`k${i}`);
    const stored = await loadHandled();
    expect(stored).toHaveLength(30);
    expect(stored[0]).toBe('k5'); // las 5 más viejas se descartan
    expect(stored[29]).toBe('k34');
  });

  it('tolera JSON corrupto devolviendo []', async () => {
    await AsyncStorage.setItem('handled_reminder_responses', '{no es json');
    expect(await loadHandled()).toEqual([]);
  });
});
