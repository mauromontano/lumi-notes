import { botRows, levelPatch, showTextPatch, LEVEL_LABELS } from '../notificationSettings';
import type { NotificationSettings } from '../types';
const settings: NotificationSettings = { quietHours: { start: '23:00', end: '08:00', timeZone: 'America/Argentina/Buenos_Aires' }, rules: [
  { agent: 'gym', name: 'Gym', eventKind: 'reply', level: 'normal', showText: true },
  { agent: 'gym', name: 'Gym', eventKind: 'approval', level: 'normal', showText: false },
  { agent: 'gym', name: 'Gym', eventKind: 'system', level: 'urgent', showText: true },
  { agent: 'finanzas', name: 'Finanzas', eventKind: 'reply', level: 'silent', showText: true },
] };
test('one row per bot, with the level of its replies and whether any text is hidden', () => {
  expect(botRows(settings)).toEqual([{ agent: 'finanzas', name: 'Finanzas', level: 'silent', showText: true }, { agent: 'gym', name: 'Gym', level: 'normal', showText: false }]);
});
test('hiding the text applies to everything the bot says, not only replies', () => {
  expect(showTextPatch('gym', false)).toEqual({ rules: ['reply', 'approval', 'watch'].map(eventKind => ({ agent: 'gym', eventKind, showText: false })) });
});
test('the level a bot uses for replies also applies to its approvals', () => {
  expect(levelPatch('gym', 'urgent')).toEqual({ rules: [{ agent: 'gym', eventKind: 'reply', level: 'urgent' }, { agent: 'gym', eventKind: 'approval', level: 'urgent' }] });
  expect(Object.keys(LEVEL_LABELS)).toEqual(['normal', 'urgent', 'silent', 'digest']);
});
