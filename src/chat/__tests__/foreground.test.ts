import { foregroundBehavior } from '../foreground';
const topic = 'a2156936-088a-4df5-aa38-b87f4edaa802', other = 'b2156936-088a-4df5-aa38-b87f4edaa802';
const shown = { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false };
const quiet = { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
test('with the app open, a push from another chat still shows as a banner', () => {
  expect(foregroundBehavior({ topicId: topic }, other)).toEqual(shown);
  expect(foregroundBehavior({ topicId: topic }, null)).toEqual(shown);
});
test('a push for the chat on screen stays quiet: the reply appears there by itself', () => {
  expect(foregroundBehavior({ topicId: topic }, topic)).toEqual(quiet);
});
test('pushes without a valid chat id are shown, never silently dropped', () => {
  for (const data of [undefined, {}, { topicId: 42 }, { topicId: 'not-a-uuid' }]) expect(foregroundBehavior(data, topic)).toEqual(shown);
});
