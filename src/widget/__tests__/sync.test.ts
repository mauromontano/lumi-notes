import { appGroup } from '@/native/appGroup';
import { syncWidget } from '../sync';
jest.mock('@/native/appGroup', () => ({ appGroup: { set: jest.fn(), reloadWidget: jest.fn() } }));
test('the app writes the snapshot for the widget and reloads it; a failure leaves the last one', async () => {
  const now = new Date('2026-10-26T15:00:00-03:00');
  await syncWidget({ today: async () => ({ pending: 1, nextEvent: null, nextReminder: null, agenda: 'off', updatedAt: now.toISOString() }) }, now);
  expect(appGroup.set).toHaveBeenCalledWith('widget', JSON.stringify({ pending: 1, pendingLine: '1 cosa espera tu OK', updatedAt: now.toISOString() }));
  expect(appGroup.reloadWidget).toHaveBeenCalledTimes(1);
  await syncWidget({ today: async () => { throw new Error('offline'); } }, now);
  expect(appGroup.set).toHaveBeenCalledTimes(1);
});
