import { orderTopics } from '../topicOrder';
import type { Topic } from '../types';
const t = (id: string, title: string, agent?: string): Topic => ({ id, title, enabled: true, unreadCount: 0, agent });
test('Lumi, the general assistant, always comes first and the rest keep the server order', () => {
  const topics = [t('1', 'Finanzas', 'finanzas'), t('2', 'Gym', 'gym'), t('3', 'Lumi', 'lumi'), t('4', 'Compras y ofertas')];
  expect(orderTopics(topics).map(x => x.title)).toEqual(['Lumi', 'Finanzas', 'Gym', 'Compras y ofertas']);
});
test('without a Lumi topic the order is unchanged', () => {
  const topics = [t('1', 'Finanzas', 'finanzas'), t('2', 'Gym', 'gym')];
  expect(orderTopics(topics)).toEqual(topics);
});
