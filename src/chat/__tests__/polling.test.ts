import { nextPollDelay } from '../polling';
it('does not poll idle chats or keep retrying indefinitely', () => {
  expect(nextPollDelay(false, 0, 0)).toBeNull();
  expect(nextPollDelay(false, 1, 0)).toBeNull();
  expect(nextPollDelay(true, 0, 0)).toBe(3000);
  expect(nextPollDelay(true, 1, 1000)).toBe(6000);
  expect(nextPollDelay(true, 3, 1000)).toBeNull();
  expect(nextPollDelay(true, 0, 600000)).toBeNull();
});
